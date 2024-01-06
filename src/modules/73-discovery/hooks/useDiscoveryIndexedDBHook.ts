/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import { openDB, IDBPDatabase, DBSchema } from 'idb'
import { useEffect, useState } from 'react'
import SessionToken from 'framework/utils/SessionToken'
import { useToaster } from '@common/exports'
import { ModuleName } from 'framework/types/ModuleName'
import { loggerFor } from 'framework/logging/logging'
import { ApiCreateNetworkMapRequest } from 'services/servicediscovery'

export enum DiscoveryObjectStoreNames {
  NETWORK_MAP = 'networkMap'
}

export const DiscoveryIndexedDBPrimaryKeys = {
  NETWORK_MAP: 'identity'
}

const logger = loggerFor(ModuleName.COMMON)

interface DiscoveryObjectStore {
  name: DiscoveryObjectStoreNames
  options?: IDBObjectStoreParameters
  index?: {
    name: string
    keyPath: string | string[]
    options?: IDBIndexParameters
  }
}

export interface DiscoveryIDBData extends DBSchema {
  networkMap: {
    key: string
    value: ApiCreateNetworkMapRequest
    indexes: { [s: string]: IDBValidKey }
  }
}

const OBJECT_STORES: DiscoveryObjectStore[] = [
  {
    name: DiscoveryObjectStoreNames.NETWORK_MAP,
    options: {
      keyPath: DiscoveryIndexedDBPrimaryKeys.NETWORK_MAP,
      autoIncrement: false
    }
  }
]

async function initializeDiscoveryDB(
  setDBInstance: (dbInstance?: IDBPDatabase<DiscoveryIDBData>) => void
): Promise<IDBPDatabase<DiscoveryIDBData> | void> {
  try {
    const dbInstance = await openDB<DiscoveryIDBData>(
      'DISCOVERY-INDEXED-DB',
      SessionToken.getLastTokenSetTime() || new Date().getTime(),
      {
        upgrade(db) {
          for (const store of OBJECT_STORES) {
            try {
              if (!db.objectStoreNames.contains(store.name)) {
                const dbStore = db.createObjectStore(store.name, store.options)
                /* istanbul ignore next */
                if (store.index) {
                  const { name, keyPath, options } = store.index
                  dbStore.createIndex(name, keyPath, options)
                }
              }
            } catch (exception) {
              /* istanbul ignore next */
              logger.error(`Exception thrown when attempting to create an object store: ${exception}`)
            }
          }
        },
        blocked() {
          /* istanbul ignore next */ dbInstance?.close()
          setDBInstance()
        },
        blocking() {
          /* istanbul ignore next */ dbInstance?.close()
          setDBInstance()
        }
      }
    )
    return dbInstance
  } catch (e) {
    logger.error(`Exception thrown by indexedDB: ${e}`)
  }
}

type DiscoveryIndexedDBHookReturnType = {
  isInitializingDB: boolean
  dbInstance?: IDBPDatabase<DiscoveryIDBData>
}

interface DiscoveryIndexDBHookProps {
  clearStoreList?: DiscoveryObjectStoreNames[] // making it optional for now, change it after removing usages in old onboarding
}

export function useDiscoveryIndexedDBHook(props?: DiscoveryIndexDBHookProps): DiscoveryIndexedDBHookReturnType {
  const [isInitializingDB, setInitializingDB] = useState<boolean>(true)
  const [dbInstance, setDBInstance] = useState<IDBPDatabase<DiscoveryIDBData> | undefined>()
  const { showWarning } = useToaster()
  useEffect(() => {
    initializeDiscoveryDB(setDBInstance).then(db => {
      if (db) {
        setDBInstance(db)
        setInitializingDB(false)
      }
    })
  }, [])

  const clearDB = async (item: DiscoveryObjectStoreNames): Promise<void> => {
    try {
      await dbInstance?.clear(item)
    } catch (e) {
      showWarning(e)
    }
  }

  useEffect(() => {
    return () => {
      if (props?.clearStoreList?.length) {
        props?.clearStoreList?.map(item => {
          clearDB(item)
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbInstance])

  return { isInitializingDB, dbInstance }
}
