/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { defaultTo, isEqual, omit } from 'lodash-es'
import { useParams } from 'react-router-dom'
import { ButtonVariation, Checkbox, Tag } from '@harness/uicore'
import { parse } from '@common/utils/YamlHelperMethods'
import { YamlBuilderMemo } from '@common/components/YAMLBuilder/YamlBuilder'
import type { YamlBuilderHandlerBinding } from '@common/interfaces/YAMLBuilderProps'
import { useStrings } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import RbacButton from '@rbac/components/Button/Button'
import type { PipelineType } from '@common/interfaces/RouteInterfaces'
import { StoreType } from '@common/constants/GitSyncTypes'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import type { EntityValidityDetails, PipelineInfoConfig } from 'services/pipeline-ng'
// TODO start
import { getYamlFileName } from '@pipeline/utils/yamlUtils'
import type { Pipeline } from '@pipeline/utils/types'
import { useEnableEditModes } from '@pipeline/components/PipelineStudio/hooks/useEnableEditModes'
import { useVariablesExpression } from '@pipeline/components/PipelineStudio/PiplineHooks/useVariablesExpression'
import { usePipelineSchema } from '@pipeline/components/PipelineStudio/PipelineSchema/PipelineSchemaContext'
// TODO end
import { usePipelineContextY1 } from '../PipelineContext/PipelineContextY1'
import { pipelineMetadataKeys } from '../PipelineContext/PipelineAsyncActionsY1'
import css from './PipelineYamlViewY1.module.scss'

export const POLL_INTERVAL = 1 /* sec */ * 1000 /* ms */

let Interval: number | undefined
const defaultFileName = 'Pipeline.yaml'
function PipelineYamlViewY1(): React.ReactElement {
  const {
    state: {
      pipeline,
      pipelineMetadata,
      pipelineView: { isDrawerOpened, isYamlEditable },
      pipelineView,
      gitDetails,
      entityValidityDetails,
      storeMetadata
    },
    updatePipelineView,
    stepsFactory,
    isReadonly,
    updatePipeline,
    updateEntityValidityDetails,
    setYamlHandler: setYamlHandlerContext
  } = usePipelineContextY1()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<
    PipelineType<{
      orgIdentifier: string
      projectIdentifier: string
      accountId: string
    }>
  >()
  const { preference, setPreference: setYamlAlwaysEditMode } = usePreferenceStore<string | undefined>(
    PreferenceScope.USER,
    'YamlAlwaysEditMode'
  )
  const userPreferenceEditMode = React.useMemo(() => defaultTo(Boolean(preference === 'true'), false), [preference])
  const { enableEditMode } = useEnableEditModes()
  const { pipelineSchema } = usePipelineSchema()
  const {
    isGitSyncEnabled: isGitSyncEnabledForProject,
    gitSyncEnabledOnlyForFF,
    supportingGitSimplification
  } = useAppStore()
  const isGitSyncEnabled = isGitSyncEnabledForProject && !gitSyncEnabledOnlyForFF
  const isPipelineRemote = supportingGitSimplification && storeMetadata?.storeType === StoreType.REMOTE
  const [yamlHandler, setYamlHandler] = React.useState<YamlBuilderHandlerBinding | undefined>()
  const [yamlFileName, setYamlFileName] = React.useState<string>(defaultFileName)
  const { getString } = useStrings()
  const { expressions } = useVariablesExpression()
  const expressionRef = React.useRef<string[]>([])
  expressionRef.current = expressions
  const updateEntityValidityDetailsRef = React.useRef<(entityValidityDetails: EntityValidityDetails) => Promise<void>>()
  updateEntityValidityDetailsRef.current = updateEntityValidityDetails

  const remoteFileName = React.useMemo(
    () =>
      getYamlFileName({
        isPipelineRemote,
        filePath: gitDetails?.filePath,
        defaultName: defaultFileName
      }),
    [gitDetails?.filePath, isPipelineRemote]
  )

  // setup polling
  React.useEffect(() => {
    try {
      if (yamlHandler && !isDrawerOpened) {
        Interval = window.setInterval(() => {
          try {
            const pipelineFromYaml = parse<Pipeline>(yamlHandler.getLatestYaml()) as unknown as PipelineInfoConfig
            // Do not call updatePipeline with undefined, pipelineFromYaml check in below if condition prevents that.
            // This can happen when somebody adds wrong yaml (e.g. connector's yaml) into pipeline yaml that is stored in Git
            // and opens pipeline in harness. At this time above line will evaluate to undefined
            if (
              pipelineFromYaml &&
              !isEqual(omit(pipeline, ...pipelineMetadataKeys), pipelineFromYaml) &&
              yamlHandler.getYAMLValidationErrorMap()?.size === 0 // Don't update for Invalid Yaml
            ) {
              updatePipeline(pipelineFromYaml).then(() => {
                if (entityValidityDetails?.valid === false) {
                  updateEntityValidityDetailsRef.current?.({ ...entityValidityDetails, valid: true, invalidYaml: '' })
                }
              })
            }
          } catch (e) {
            // Ignore Error
          }
        }, POLL_INTERVAL)
        return () => {
          window.clearInterval(Interval)
        }
      }
    } catch (e) {
      // Ignore Error
    }
  }, [yamlHandler, pipeline, isDrawerOpened])

  React.useEffect(() => {
    if (yamlHandler) {
      setYamlHandlerContext(yamlHandler)
    }
  }, [yamlHandler, setYamlHandlerContext])

  React.useEffect(() => {
    if (isGitSyncEnabled && !isPipelineRemote) {
      if (gitDetails?.objectId) {
        const filePathArr = gitDetails.filePath?.split('/')
        const fileName = filePathArr?.length ? filePathArr[filePathArr?.length - 1] : 'Pipeline.yaml'
        setYamlFileName(fileName)
      }
      setYamlFileName((pipelineMetadata?.identifier || pipeline?.identifier) + '.yaml')
    }
  }, [gitDetails, isGitSyncEnabled, isPipelineRemote, pipeline?.identifier, pipelineMetadata?.identifier])

  const onEditButtonClick = async (): Promise<void> => {
    try {
      const isAlwaysEditModeEnabled = await enableEditMode()
      updatePipelineView({ ...pipelineView, isYamlEditable: true })
      setYamlAlwaysEditMode(String(isAlwaysEditModeEnabled))
    } catch (_) {
      // Ignore.. use cancelled enabling edit mode
    }
  }

  const yamlOrJsonProp =
    entityValidityDetails?.valid === false && entityValidityDetails?.invalidYaml
      ? { existingYaml: entityValidityDetails?.invalidYaml }
      : { existingJSON: omit(pipeline, ...pipelineMetadataKeys) }

  React.useEffect(() => {
    if (userPreferenceEditMode) {
      updatePipelineView({ ...pipelineView, isYamlEditable: true })
    }
  }, [userPreferenceEditMode])

  return (
    <div className={css.yamlBuilder}>
      <>
        {!isDrawerOpened && (
          <YamlBuilderMemo
            fileName={isPipelineRemote ? remoteFileName : defaultTo(yamlFileName, defaultFileName)}
            entityType="Pipelines"
            isReadOnlyMode={isReadonly || !isYamlEditable}
            bind={setYamlHandler}
            onExpressionTrigger={() =>
              Promise.resolve(
                expressionRef.current.map(item => ({
                  label: item,
                  insertText: `${item}>`,
                  kind: 1,
                  detail: `<+${item}}>`
                }))
              )
            }
            yamlSanityConfig={{ removeEmptyString: false, removeEmptyObject: false, removeEmptyArray: false }}
            // TODO: Is possible to auto layout?
            height={'calc(100vh - 200px)'}
            width="calc(100vw - 400px)"
            invocationMap={stepsFactory.getInvocationMap()}
            schema={pipelineSchema?.data}
            isEditModeSupported={!isReadonly}
            openDialogProp={onEditButtonClick}
            {...yamlOrJsonProp}
          />
        )}
      </>
      <div className={css.buttonsWrapper}>
        {isYamlEditable ? (
          <Checkbox
            className={css.editModeCheckbox}
            onChange={e => setYamlAlwaysEditMode(String((e.target as HTMLInputElement).checked))}
            checked={userPreferenceEditMode}
            large
            label={getString('pipeline.alwaysEditModeYAML')}
          />
        ) : (
          <>
            <Tag>{getString('common.readOnly')}</Tag>
            <RbacButton
              permission={{
                resourceScope: {
                  accountIdentifier: accountId,
                  orgIdentifier,
                  projectIdentifier
                },
                resource: {
                  resourceType: ResourceType.PIPELINE,
                  resourceIdentifier: pipeline?.identifier as string
                },
                permission: PermissionIdentifier.EDIT_PIPELINE
              }}
              variation={ButtonVariation.SECONDARY}
              text={getString('common.editYaml')}
              onClick={onEditButtonClick}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default PipelineYamlViewY1