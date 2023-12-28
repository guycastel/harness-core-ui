/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import * as Yup from 'yup'
import cx from 'classnames'
import { v4 as nameSpace, v5 as uuid } from 'uuid'
import { defaultTo, isUndefined, omit, uniqBy } from 'lodash-es'
import type { FormikProps } from 'formik'
import { Switch } from '@blueprintjs/core'
import { AllowedTypes, Formik, FormikForm, FormInput } from '@harness/uicore'

import type { Toleration } from 'services/cd-ng'
import type { EmptyDirYaml, HostPathYaml, PersistentVolumeClaimYaml } from 'services/pipeline-ng'
import { useStrings, UseStringsReturn } from 'framework/strings'
import type { StringsMap } from 'framework/strings/StringsContext'
import { k8sLabelRegex, k8sAnnotationRegex } from '@common/utils/StringUtils'
import type { ListUIType } from '@pipeline/components/List/List'
import type { MapUIType } from '@common/components/Map/Map'
import { StepViewType, StepFormikFowardRef, setFormikRef } from '@pipeline/components/AbstractSteps/Step'
import { VolumesTypes } from '@pipeline/components/Volumes/Volumes'
import { StageType } from '@pipeline/utils/stageHelpers'
import type { MultiTypeListType, MultiTypeListUIType } from '../StepsTypes'
import { getNameAndIdentifierSchema } from '../StepsValidateUtils'
import { KubernetesStepGroupInfra } from './KubernetesStepGroupInfra'
import {
  K8sDirectInfraStepGroupElementConfig,
  StepGroupFormikValues,
  TolerationFormik,
  dummyContainerSGValue
} from './StepGroupUtil'
import { StepGroupCustomStepProps } from './StepGroupStep'
import StepGroupVariables from './StepGroupVariablesSelection/StepGroupVariables'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'
interface StepGroupWidgetProps {
  initialValues: K8sDirectInfraStepGroupElementConfig
  isNewStep?: boolean
  onUpdate?: (data: StepGroupFormikValues) => void
  onChange?: (data: StepGroupFormikValues) => void
  stepViewType?: StepViewType
  readonly?: boolean
  allowableTypes?: AllowedTypes
  customStepProps: StepGroupCustomStepProps
}

const validateUniqueList = ({
  value,
  getString,
  uniqueKey,
  stringKey
}: {
  value: string[] | unknown
  getString: UseStringsReturn['getString']
  uniqueKey?: string
  stringKey?: keyof StringsMap
}): Yup.NotRequiredArraySchema<unknown> | Yup.StringSchema => {
  if (Array.isArray(value)) {
    return Yup.array().test('valuesShouldBeUnique', getString(stringKey || 'validation.uniqueValues'), list => {
      if (!list) {
        return true
      }

      return uniqBy(list, uniqueKey || 'value').length === list.length
    })
  } else {
    return Yup.string()
  }
}

const getInitialListValues = (value: MultiTypeListType): MultiTypeListUIType => {
  return typeof value === 'string'
    ? value
    : value
        ?.filter((path: string) => !!path)
        ?.map((_value: string) => ({
          id: uuid('', nameSpace()),
          value: _value
        })) || []
}

const getInitialComplexMapValues = (value?: Toleration[]): TolerationFormik[] => {
  if (typeof value === 'string') {
    return value
  }
  const modifiedList = (value || []).map(currValue => {
    return {
      id: uuid('', nameSpace()),
      ...currValue
    }
  })
  return modifiedList
}

function StepGroupStepEdit(
  props: StepGroupWidgetProps,
  formikRef: StepFormikFowardRef<StepGroupFormikValues>
): React.ReactElement {
  const {
    initialValues,
    onUpdate,
    onChange,
    isNewStep = true,
    readonly,
    allowableTypes,
    stepViewType,
    customStepProps
  } = props
  const { selectedStage, isRollback, isProvisionerStep, isAnyParentContainerStepGroup } = customStepProps

  const { getString } = useStrings()

  const [isContainerBasedExecutionEnabled, setIsContainerBasedExecutionEnabled] = useState<boolean>(
    defaultTo(!!initialValues.stepGroupInfra?.type, false)
  )

  React.useEffect(() => {
    const formikRefCurrent = (formikRef as React.MutableRefObject<FormikProps<StepGroupFormikValues>>)?.current
    if (isContainerBasedExecutionEnabled) {
      formikRefCurrent?.setValues({
        ...formikRefCurrent.values,
        steps: formikRefCurrent.values.steps,
        type: 'KubernetesDirect'
      })
    } else {
      const containerSGKeysToBeOmitted = Object.keys(dummyContainerSGValue)
      formikRefCurrent?.setValues({
        ...omit(formikRefCurrent.values, [...containerSGKeysToBeOmitted, 'stepGroupInfra'])
      } as StepGroupFormikValues)
    }
  }, [isContainerBasedExecutionEnabled, formikRef])

  const getFieldSchema = (
    value: MapUIType,
    regex: RegExp
  ):
    | Yup.NotRequiredArraySchema<Yup.Shape<object | undefined, { key: string | undefined; value: string | undefined }>>
    | Yup.StringSchema => {
    if (Array.isArray(value)) {
      return Yup.array()
        .of(
          Yup.object().shape(
            {
              key: Yup.string().when('value', {
                is: val => val?.length,
                then: Yup.string()
                  .matches(regex, getString?.('validation.validKeyRegex'))
                  .required(getString?.('validation.keyRequired'))
              }),
              value: Yup.string().when('key', {
                is: val => val?.length,
                then: Yup.string().required(getString?.('validation.valueRequired'))
              })
            },
            [['key', 'value']]
          )
        )
        .test('keysShouldBeUnique', getString?.('validation.uniqueKeys') || '', map => {
          if (!map) return true

          return uniqBy(map, 'key').length === map.length
        })
    } else {
      return Yup.string()
    }
  }

  const getStepGroupInfraValidationObject = () => {
    if (!isContainerBasedExecutionEnabled) {
      return {}
    }
    return {
      connectorRef: Yup.string().required(
        getString('common.validation.fieldIsRequired', { name: getString('platform.connectors.title.k8sCluster') })
      ),
      namespace: Yup.string().required(
        getString('common.validation.fieldIsRequired', { name: getString('common.namespace') })
      ),
      runAsUser: Yup.string().test(
        'Must be a number and allows runtimeinput or expression',
        getString('pipeline.stepCommonFields.validation.mustBeANumber', {
          label: getString('pipeline.stepCommonFields.runAsUser')
        }) || '',
        function (runAsUser) {
          if (isUndefined(runAsUser) || !runAsUser) {
            return true
          } else if (runAsUser.startsWith('<+')) {
            return true
          }
          return !isNaN(runAsUser)
        }
      ),
      volumes: Yup.array()
        .nullable()
        .test({
          test: value => !value || uniqBy(value, 'mountPath').length === value.length,
          message: getString('pipeline.ci.validations.mountPathUnique')
        })
        .test({
          test: value => {
            const pattern = /^\d+(\.\d+)?$|^\d+(\.\d+)?(G|M|Gi|Mi)$|^$/
            // invalid if size doesn't follow pattern or is an integer without units
            const isSizeInvalid = value?.some(
              (volume: EmptyDirYaml) =>
                volume?.spec?.size && (!pattern.test(volume.spec.size) || !isNaN(volume.spec.size as unknown as number))
            )
            return !isSizeInvalid
          },
          message: getString('pipeline.ci.validations.invalidSize')
        })
        .test({
          test: value => {
            const isPathMissing = value?.some(
              (volume: HostPathYaml) => volume.type === VolumesTypes.HostPath && !volume.spec?.path
            )
            return !isPathMissing
          },
          message: getString('pipeline.ci.validations.pathRequiredForHostPath')
        })
        .test({
          test: value => {
            const isTypeMissing = value?.some(
              (volume: EmptyDirYaml | PersistentVolumeClaimYaml | HostPathYaml) => volume.mountPath && !volume.type
            )
            return !isTypeMissing
          },
          message: getString('common.validation.fieldIsRequired', { name: getString('typeLabel') })
        }),
      annotations: Yup.lazy(
        (value: MapUIType) => getFieldSchema(value, k8sAnnotationRegex) as unknown as Yup.Schema<MapUIType>
      ),
      labels: Yup.lazy((value: MapUIType) => getFieldSchema(value, k8sLabelRegex) as unknown as Yup.Schema<MapUIType>),
      addCapabilities: Yup.lazy(value => validateUniqueList({ value, getString })),
      dropCapabilities: Yup.lazy(value => validateUniqueList({ value, getString })),
      tolerations: Yup.lazy(value =>
        validateUniqueList({ value, getString, uniqueKey: 'key', stringKey: 'pipeline.ci.validations.keyUnique' })
      ),
      hostNames: Yup.lazy(value => validateUniqueList({ value, getString }))
    }
  }

  const validationSchema = Yup.object().shape({
    ...getNameAndIdentifierSchema(getString, stepViewType),
    sharedPaths: Yup.lazy(value => {
      if (Array.isArray(value)) {
        return Yup.array().test('valuesShouldBeUnique', getString('validation.uniqueValues'), list => {
          if (!list) return true

          return uniqBy(list, 'value').length === list.length
        })
      } else {
        return Yup.string()
      }
    }),
    ...getStepGroupInfraValidationObject()
  })

  const getKubernetesInfraPayload = (): Omit<StepGroupFormikValues, 'identifier' | 'name'> => {
    const labels = Object.keys(defaultTo(initialValues.stepGroupInfra?.spec?.labels, {}))?.map(key => {
      const value = initialValues.stepGroupInfra?.spec?.labels?.[key]
      return {
        id: uuid('', nameSpace()),
        key: key,
        value: defaultTo(value, '')
      }
    })

    const annotations = Object.keys(defaultTo(initialValues.stepGroupInfra?.spec?.annotations, {}))?.map(key => {
      const value = initialValues.stepGroupInfra?.spec?.annotations?.[key]
      return {
        id: uuid('', nameSpace()),
        key: key,
        value: defaultTo(value, '')
      }
    })

    const nodeSelectors = Object.keys(defaultTo(initialValues.stepGroupInfra?.spec?.nodeSelector, {}))?.map(key => {
      const value = initialValues.stepGroupInfra?.spec?.nodeSelector?.[key]
      return {
        id: uuid('', nameSpace()),
        key: key,
        value: defaultTo(value, '')
      }
    })

    return {
      type: 'KubernetesDirect',
      connectorRef: initialValues.stepGroupInfra?.spec.connectorRef,
      namespace: initialValues.stepGroupInfra?.spec?.namespace,
      serviceAccountName: initialValues.stepGroupInfra?.spec?.serviceAccountName,
      volumes: initialValues.stepGroupInfra?.spec?.volumes,
      runAsUser: initialValues.stepGroupInfra?.spec?.containerSecurityContext?.runAsUser,
      initTimeout: initialValues.stepGroupInfra?.spec?.initTimeout,
      labels: labels,
      annotations: annotations,
      priorityClassName: initialValues.stepGroupInfra?.spec?.priorityClassName as unknown as string,
      automountServiceAccountToken: initialValues.stepGroupInfra?.spec?.automountServiceAccountToken,
      privileged: initialValues.stepGroupInfra?.spec?.containerSecurityContext?.privileged,
      allowPrivilegeEscalation: initialValues.stepGroupInfra?.spec?.containerSecurityContext?.allowPrivilegeEscalation,
      addCapabilities: getInitialListValues(
        initialValues.stepGroupInfra?.spec?.containerSecurityContext?.capabilities?.add || []
      ),
      dropCapabilities: getInitialListValues(
        initialValues.stepGroupInfra?.spec?.containerSecurityContext?.capabilities?.drop || []
      ),
      runAsNonRoot: initialValues.stepGroupInfra?.spec?.containerSecurityContext?.runAsNonRoot,
      readOnlyRootFilesystem: initialValues.stepGroupInfra?.spec?.containerSecurityContext?.readOnlyRootFilesystem,
      tolerations: getInitialComplexMapValues(initialValues.stepGroupInfra?.spec?.tolerations),
      nodeSelector: nodeSelectors,
      harnessImageConnectorRef: initialValues.stepGroupInfra?.spec?.harnessImageConnectorRef,
      hostNames: getInitialListValues(initialValues.stepGroupInfra?.spec?.hostNames || [])
    }
  }

  const getInitialValues = (): StepGroupFormikValues => {
    if (initialValues?.stepGroupInfra?.type && (stepViewType === StepViewType.Template || initialValues.identifier)) {
      const sharedPaths: ListUIType | string =
        typeof initialValues.sharedPaths === 'string'
          ? initialValues.sharedPaths
          : initialValues.sharedPaths
              ?.filter((path: string) => !!path)
              ?.map((_value: string) => ({
                id: uuid('', nameSpace()),
                value: _value
              })) || []

      return {
        ...initialValues,
        sharedPaths,
        ...getKubernetesInfraPayload()
      } as StepGroupFormikValues
    }

    return initialValues
  }

  return (
    <>
      <Formik<StepGroupFormikValues>
        onSubmit={values => {
          onUpdate?.(values)
        }}
        validate={formValues => {
          onChange?.(formValues)
        }}
        formName="stepGroup"
        initialValues={getInitialValues()}
        validationSchema={validationSchema}
      >
        {(formik: FormikProps<StepGroupFormikValues>) => {
          setFormikRef(formikRef, formik)
          return (
            <FormikForm>
              {stepViewType !== StepViewType.Template && (
                <div className={cx(stepCss.formGroup, stepCss.md)}>
                  <FormInput.InputWithIdentifier inputLabel={getString('name')} isIdentifierEditable={isNewStep} />
                </div>
              )}
              <StepGroupVariables
                allowableTypes={allowableTypes}
                formikRef={formik}
                readonly={readonly}
                isRollback={isRollback}
                isProvisionerStep={isProvisionerStep}
              />
              {!isAnyParentContainerStepGroup && selectedStage.stage?.type !== StageType.BUILD && (
                <>
                  <Switch
                    checked={isContainerBasedExecutionEnabled}
                    label={getString('pipeline.enableContainerBasedExecution')}
                    onChange={() => setIsContainerBasedExecutionEnabled(!isContainerBasedExecutionEnabled)}
                    disabled={readonly}
                  />
                  {isContainerBasedExecutionEnabled && (
                    <div className={cx(stepCss.formGroup, stepCss.lg)}>
                      <KubernetesStepGroupInfra
                        formikRef={formik}
                        allowableTypes={allowableTypes}
                        readonly={readonly}
                      />
                    </div>
                  )}
                </>
              )}
            </FormikForm>
          )
        }}
      </Formik>
    </>
  )
}

export const StepGroupStepEditRef = React.forwardRef(StepGroupStepEdit)
