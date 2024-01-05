/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Draggable } from 'react-beautiful-dnd'
import {
  Button,
  ButtonVariation,
  Card,
  Icon,
  Text,
  AllowedTypes,
  ButtonSize,
  Layout,
  SelectOption
} from '@harness/uicore'
import { Color } from '@harness/design-system'
import { Collapse } from '@blueprintjs/core'
import { useFormikContext } from 'formik'
import { defaultTo, get, isNil, pick, set } from 'lodash-es'
import produce from 'immer'
import cx from 'classnames'

import { getStepTypeByDeploymentType, ServiceDeploymentType } from '@pipeline/utils/stageHelpers'
import { deploymentIconMap } from '@cd/utils/deploymentUtils'
import { useStrings } from 'framework/strings'
import { StepWidget } from '@pipeline/components/AbstractSteps/StepWidget'
import factory from '@pipeline/components/PipelineSteps/PipelineStepFactory'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import type { EntityGitDetails, NGServiceV2InfoConfig, ServiceSpec } from 'services/cd-ng'
import { StageFormContextProvider } from '@pipeline/context/StageFormContext'

import { useDeepCompareEffect } from '@common/hooks'
import type { PipelinePathProps, PipelineType } from '@common/interfaces/RouteInterfaces'
import { ResourceType } from '@rbac/interfaces/ResourceType'
import { PermissionIdentifier } from '@rbac/interfaces/PermissionIdentifier'
import RbacButton from '@rbac/components/Button/Button'
import { getScopedValueFromDTO } from '@common/components/EntityReference/EntityReference.types'
import { StoreMetadata, StoreType } from '@modules/10-common/constants/GitSyncTypes'
import GitRemoteDetails from '@modules/10-common/components/GitRemoteDetails/GitRemoteDetails'
import { getScopedServiceUrl } from '@modules/70-pipeline/utils/scopedUrlUtils'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import type { FormState, ServiceData } from '../DeployServiceEntityUtils'
import css from './ServiceEntitiesList.module.scss'

export interface ServiceEntityCardProps extends ServiceData {
  readonly?: boolean
  stageIdentifier?: string
  deploymentType?: string
  allowableTypes: AllowedTypes
  onEditClick(svc: ServiceData): void
  onDeleteClick(svc: ServiceData): void
  cardClassName?: string
  isPropogateFromStage: boolean
  serviceIndex: number
  storeMetadata?: StoreMetadata
  entityGitDetails?: EntityGitDetails
}

const getScopedRefUsingIdentifier = (
  formik: any,
  service: NGServiceV2InfoConfig & {
    yaml: string
  }
): string => {
  const serviceRef = get(formik?.values, 'service')
  if (serviceRef) {
    return serviceRef
  }
  return get(formik?.values, 'services', []).find((svc: SelectOption) => svc.value === getScopedValueFromDTO(service))
    ?.value
}

export function ServiceEntityCard(props: ServiceEntityCardProps): React.ReactElement {
  const {
    service,
    serviceInputs,
    readonly,
    onEditClick,
    onDeleteClick,
    allowableTypes,
    stageIdentifier,
    deploymentType,
    cardClassName,
    isPropogateFromStage,
    serviceIndex,
    storeMetadata = {},
    entityGitDetails
  } = props
  const [showInputs, setShowInputs] = React.useState(false)
  const { getString } = useStrings()
  const formik = useFormikContext<FormState>()
  const scopedServiceRef = getScopedRefUsingIdentifier(formik, service)
  const [template, setTemplate] = React.useState<any>(serviceInputs?.serviceDefinition?.spec)
  const { isNewNavEnabled = false } = useAppStore()
  const arifactsSpecPath = `serviceInputs.['${scopedServiceRef}'].serviceDefinition.spec`
  const { storeType, connectorRef } = storeMetadata
  const type = service.serviceDefinition?.type as ServiceDeploymentType

  const { accountId, orgIdentifier, projectIdentifier, module } = useParams<PipelineType<PipelinePathProps>>()

  useDeepCompareEffect(() => {
    setTemplate(serviceInputs?.serviceDefinition?.spec)
  }, [serviceInputs?.serviceDefinition?.spec])

  function toggle(): void {
    setShowInputs(s => !s)
  }

  function getStageFormTemplate<T>(path: string): T {
    return get(template, path.replace(`${arifactsSpecPath}.`, ''))
  }

  function updateStageFormTemplate<T>(data: T, path: string): void {
    setTemplate((value: any) =>
      produce(value, (draft: any) => {
        set(draft, path.replace(`${arifactsSpecPath}.`, ''), data)
      })
    )
  }

  const isDragDisabled = useMemo(
    () => !isNil(formik.values.service) || formik.values.parallel === true || isPropogateFromStage,
    [formik.values.service, formik.values.parallel, isPropogateFromStage]
  )

  return (
    <Draggable draggableId={service.identifier} index={serviceIndex} isDragDisabled={isDragDisabled}>
      {provided => {
        return (
          <div {...provided.draggableProps} ref={provided.innerRef} style={{ ...provided.draggableProps.style }}>
            <Card className={cx(css.card, cardClassName)}>
              {!isDragDisabled && (
                <Layout.Horizontal className={css.dragHandle} flex={{ justifyContent: 'center' }}>
                  <Icon name="drag-handle-horizontal" {...provided.dragHandleProps} />
                </Layout.Horizontal>
              )}
              <div className={css.row}>
                <Layout.Horizontal className={css.serviceMetadata} margin={{ right: 'xlarge' }}>
                  <div className={css.serviceNameIconWrapper}>
                    <span className={css.serviceIcon}>
                      {type ? <Icon name={deploymentIconMap[type]} size={24} /> : null}
                    </span>
                    <span className={css.serviceNameWrapper}>
                      <Link
                        target="_blank"
                        rel="noreferrer noopener"
                        to={getScopedServiceUrl(
                          {
                            accountId,
                            orgIdentifier,
                            projectIdentifier,
                            scopedServiceIdentifier: scopedServiceRef,
                            module,
                            serviceMetadata: storeMetadata
                          },
                          isNewNavEnabled
                        )}
                      >
                        <Text color={Color.PRIMARY_7} font="normal" lineClamp={1}>
                          {service.name}
                        </Text>
                      </Link>
                      <Text color={Color.GREY_500} font="small">
                        {getString('idLabel', { id: service.identifier })}
                      </Text>
                    </span>
                  </div>
                  {storeType === StoreType.REMOTE ? (
                    <GitRemoteDetails
                      connectorRef={connectorRef}
                      repoName={entityGitDetails?.repoName}
                      branch={entityGitDetails?.branch}
                      filePath={entityGitDetails?.filePath}
                      fileUrl={entityGitDetails?.fileUrl}
                      flags={{
                        readOnly: true,
                        showBranch: true,
                        borderless: true
                      }}
                    />
                  ) : null}
                </Layout.Horizontal>

                {!isPropogateFromStage && (
                  <Layout.Horizontal>
                    <RbacButton
                      icon="Edit"
                      data-testid={`edit-service-${service.identifier}`}
                      disabled={readonly}
                      onClick={() =>
                        onEditClick({
                          service,
                          serviceInputs,
                          ...pick(storeMetadata, ['storeType', 'connectorRef']),
                          entityGitDetails
                        })
                      }
                      minimal
                      aria-label={getString('editService')}
                      permission={{
                        permission: PermissionIdentifier.EDIT_SERVICE,
                        resource: {
                          resourceType: ResourceType.SERVICE,
                          resourceIdentifier: service.identifier
                        },
                        resourceScope: {
                          accountIdentifier: accountId,
                          orgIdentifier: (service as any).orgIdentifier,
                          projectIdentifier: (service as any).projectIdentifier
                        }
                      }}
                    />
                    <Button
                      icon="main-trash"
                      data-testid={`delete-service-${service.identifier}`}
                      disabled={readonly}
                      onClick={() => onDeleteClick({ service, serviceInputs })}
                      aria-label={getString('common.deleteService')}
                      minimal
                    />
                  </Layout.Horizontal>
                )}
              </div>
              {serviceInputs && formik?.values?.serviceInputs?.[scopedServiceRef as string] ? (
                <>
                  <div className={css.toggleWrapper}>
                    <Button
                      icon={showInputs ? 'chevron-up' : 'chevron-down'}
                      data-testid="toggle-service-inputs"
                      text={getString(
                        showInputs
                          ? 'cd.pipelineSteps.serviceTab.hideServiceInputs'
                          : 'cd.pipelineSteps.serviceTab.viewServiceInputs'
                      )}
                      variation={ButtonVariation.LINK}
                      size={ButtonSize.SMALL}
                      onClick={toggle}
                    />
                  </div>
                  <Collapse keepChildrenMounted={false} isOpen={showInputs}>
                    <div className={css.serviceInputs}>
                      <Text
                        color={Color.GREY_800}
                        font={{ size: 'normal', weight: 'bold' }}
                        margin={{ bottom: 'medium' }}
                      >
                        {getString('common.serviceInputs')}
                      </Text>
                      <StageFormContextProvider
                        getStageFormTemplate={getStageFormTemplate}
                        updateStageFormTemplate={updateStageFormTemplate}
                      >
                        <StepWidget<ServiceSpec>
                          factory={factory}
                          initialValues={get(formik.values, arifactsSpecPath) || {}}
                          allowableTypes={allowableTypes}
                          template={defaultTo(template, {})}
                          type={getStepTypeByDeploymentType(defaultTo(deploymentType, ''))}
                          stepViewType={StepViewType.TemplateUsage}
                          path={arifactsSpecPath}
                          readonly={readonly}
                          customStepProps={{
                            stageIdentifier,
                            serviceIdentifier: scopedServiceRef,
                            gitMetadata: {
                              storeType,
                              connectorRef,
                              ...pick(entityGitDetails, ['repoName', 'branch'])
                            }
                          }}
                        />
                      </StageFormContextProvider>
                    </div>
                  </Collapse>
                </>
              ) : null}
            </Card>
          </div>
        )
      }}
    </Draggable>
  )
}
