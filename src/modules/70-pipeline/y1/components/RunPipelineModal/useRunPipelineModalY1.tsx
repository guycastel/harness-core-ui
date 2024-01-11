/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Dialog, IDialogProps } from '@blueprintjs/core'
import { Button, ButtonVariation, Layout, PageSpinner } from '@harness/uicore'
import { useModalHook } from '@harness/use-modal'
// TODO start
import type { InputSetSelectorProps } from '@pipeline/components/InputSetSelector/InputSetSelector'
// TODO end
import type { ExecutionPathProps, GitQueryParams, PipelineType } from '@common/interfaces/RouteInterfaces'
import { useGetInputsetYaml } from 'services/pipeline-ng'
import { RunPipelineFormY1 } from './RunPipelineFormY1'
import css from './RunPipelineFormY1.module.scss'

export interface RunPipelineModalParams {
  pipelineIdentifier: string
  executionId?: string
  inputSetSelected?: InputSetSelectorProps['value']
  stagesExecuted?: string[]
}

export interface OpenRunPipelineModalProps {
  debugMode?: boolean
  isRetryFromStage?: boolean
  preSelectLastStage?: boolean
}

export interface UseRunPipelineModalReturn {
  openRunPipelineModal: (props?: OpenRunPipelineModalProps) => void
  closeRunPipelineModal: () => void
}

export const useRunPipelineModalY1 = (
  runPipelineModaParams: RunPipelineModalParams & Omit<GitQueryParams, 'repoName'>
): UseRunPipelineModalReturn => {
  const {
    inputSetSelected,
    pipelineIdentifier,
    branch,
    repoIdentifier,
    connectorRef,
    storeType,
    executionId,
    stagesExecuted
  } = runPipelineModaParams
  const {
    projectIdentifier,
    orgIdentifier,
    accountId,
    module,
    executionIdentifier,
    source = 'executions'
  } = useParams<PipelineType<ExecutionPathProps>>()

  const storeMetadata = {
    connectorRef,
    repoName: repoIdentifier,
    branch
  }

  const [openParams, setOpenParams] = useState<OpenRunPipelineModalProps>({})

  const planExecutionId: string | undefined = executionIdentifier ?? executionId

  const [inputSetYaml, setInputSetYaml] = useState('')

  const {
    data: runPipelineInputsetData,
    loading,
    refetch: fetchExecutionData
  } = useGetInputsetYaml({
    planExecutionId: planExecutionId ?? '',
    queryParams: {
      orgIdentifier,
      projectIdentifier,
      accountIdentifier: accountId,
      resolveExpressionsType: 'RESOLVE_TRIGGER_EXPRESSIONS'
    },
    requestOptions: {
      headers: {
        'content-type': 'application/yaml'
      }
    },
    lazy: true
  })

  useEffect(() => {
    if (runPipelineInputsetData) {
      ;(runPipelineInputsetData as unknown as Response).text().then(str => {
        setInputSetYaml(str)
      })
    }
  }, [runPipelineInputsetData])

  const runModalProps: IDialogProps = {
    isOpen: true,
    autoFocus: true,
    canEscapeKeyClose: true,
    canOutsideClickClose: false,
    enforceFocus: false,
    className: css.runPipelineDialog,
    style: { width: 1028, height: 'fit-content', overflow: 'auto' },
    isCloseButtonShown: false
  }

  const [showRunPipelineModal, hideRunPipelineModal] = useModalHook(
    () =>
      loading ? (
        <PageSpinner />
      ) : (
        <Dialog {...runModalProps}>
          <Layout.Vertical className={css.modalContent}>
            <RunPipelineFormY1
              pipelineIdentifier={pipelineIdentifier}
              orgIdentifier={orgIdentifier}
              projectIdentifier={projectIdentifier}
              accountId={accountId}
              module={module}
              repoIdentifier={repoIdentifier}
              source={source}
              branch={branch}
              connectorRef={connectorRef}
              storeType={storeType}
              onClose={() => {
                hideRunPipelineModal()
              }}
              stagesExecuted={stagesExecuted}
              executionIdentifier={planExecutionId}
              storeMetadata={storeMetadata}
              isDebugMode={openParams.debugMode}
              isRetryFromStage={openParams.isRetryFromStage}
              preSelectLastStage={openParams.preSelectLastStage}
            />
            <Button
              aria-label="close modal"
              icon="cross"
              variation={ButtonVariation.ICON}
              onClick={() => hideRunPipelineModal()}
              className={css.crossIcon}
            />
          </Layout.Vertical>
        </Dialog>
      ),
    [
      loading,
      inputSetYaml,
      branch,
      repoIdentifier,
      pipelineIdentifier,
      inputSetSelected,
      stagesExecuted,
      planExecutionId
    ]
  )

  const open = useCallback(
    (params: OpenRunPipelineModalProps) => {
      if (planExecutionId) {
        fetchExecutionData()
      }
      setOpenParams(params)
      showRunPipelineModal()
    },
    [showRunPipelineModal, planExecutionId, fetchExecutionData]
  )

  return {
    openRunPipelineModal: (parms: OpenRunPipelineModalProps = {}) => open(parms),
    closeRunPipelineModal: hideRunPipelineModal
  }
}
