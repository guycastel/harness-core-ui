import React from 'react'
import {
  Text,
  Accordion,
  Layout,
  Button,
  FormInput,
  Formik,
  StepProps,
  getMultiTypeFromValue,
  MultiTypeInputType,
  Color
} from '@wings-software/uicore'
import { Form } from 'formik'
import * as Yup from 'yup'
import cx from 'classnames'
import { get } from 'lodash-es'
import { v4 as nameSpace, v5 as uuid } from 'uuid'
import { useStrings } from 'framework/exports'
import type { ConnectorConfigDTO } from 'services/cd-ng'
import { ConfigureOptions } from '@common/components/ConfigureOptions/ConfigureOptions'
import type { CommandFlags, HelmWithHTTPDataType } from '../../ManifestInterface'
import HelmAdvancedStepSection from '../HelmAdvancedStepSection'

import { helmVersions } from '../../Manifesthelper'
import css from '../ManifestWizardSteps.module.scss'
import helmcss from '../HelmWithGIT/HelmWithGIT.module.scss'
import stepCss from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

interface HelmWithHttpPropType {
  stepName: string
  expressions: string[]
  initialValues: any
  handleSubmit: (data: any) => void
}

const commandFlagOptionsV2 = [
  { label: 'Fetch', value: 'Fetch' },
  { label: 'Version ', value: 'Version' },
  { label: 'Template ', value: 'Template' }
]
const commandFlagOptionsV3 = [
  { label: 'Pull', value: 'Pull' },
  { label: 'Version ', value: 'Version' },
  { label: 'Template ', value: 'Template' }
]

const HelmWithHttp: React.FC<StepProps<ConnectorConfigDTO> & HelmWithHttpPropType> = ({
  stepName,
  prevStepData,
  expressions,
  initialValues,
  handleSubmit,
  previousStep
}) => {
  const { getString } = useStrings()
  const isActiveAdvancedStep: boolean = initialValues?.spec?.skipResourceVersioning || initialValues?.spec?.commandFlags

  const getInitialValues = (): HelmWithHTTPDataType => {
    const specValues = get(initialValues, 'spec.store.spec', null)

    if (specValues) {
      const values = {
        ...specValues,
        identifier: initialValues.identifier,
        helmVersion:
          helmVersions.find(version => version.value === initialValues.spec?.helmVersion) ||
          initialValues.spec?.helmVersion,
        chartName: initialValues.spec?.chartName,
        chartVersion: initialValues.spec?.chartVersion,
        skipResourceVersioning: initialValues?.spec?.skipResourceVersioning,
        commandFlags: initialValues.spec?.commandFlags?.map((commandFlag: { commandType: string; flag: string }) => ({
          commandType: commandFlag.commandType,
          flag: commandFlag.flag
          // id: uuid(commandFlag, nameSpace())
        })) || [{ commandType: undefined, flag: undefined, id: uuid('', nameSpace()) }]
      }
      return values
    }
    return {
      identifier: '',
      helmVersion: helmVersions[0],
      chartName: '',
      chartVersion: '',
      skipResourceVersioning: false,
      commandFlags: [{ commandType: undefined, flag: undefined, id: uuid('', nameSpace()) }]
    }
  }
  const submitFormData = (formData: any): void => {
    const manifestObj: any = {
      manifest: {
        identifier: formData.identifier,
        spec: {
          store: {
            type: formData?.store,
            spec: {
              connectorRef: formData?.connectorRef
            }
          },
          chartName: formData?.chartName,
          chartVersion: formData?.chartVersion,
          helmVersion: formData?.helmVersion.value ? formData?.helmVersion.value : formData?.helmVersion,
          skipResourceVersioning: formData?.skipResourceVersioning
        }
      }
    }
    if (formData?.commandFlags[0].commandType) {
      manifestObj.manifest.spec.commandFlags = formData?.commandFlags.map((commandFlag: CommandFlags) => ({
        commandType: commandFlag.commandType,
        flag: commandFlag.flag
      }))
    }
    handleSubmit(manifestObj)
  }

  return (
    <Layout.Vertical spacing="xxlarge" padding="small" className={css.manifestStore}>
      <Text font="large" color={Color.GREY_800}>
        {stepName}
      </Text>
      <Formik
        initialValues={getInitialValues()}
        validationSchema={Yup.object().shape({
          chartName: Yup.string().trim().required(getString('manifestType.http.chartNameRequired')),
          chartVersion: Yup.string().trim().required(getString('manifestType.http.chartVersionRequired')),
          helmVersion: Yup.string().trim().required(getString('manifestType.helmVersionRequired'))
        })}
        onSubmit={formData => {
          submitFormData({
            ...prevStepData,
            ...formData,
            connectorRef: prevStepData?.connectorRef
              ? getMultiTypeFromValue(prevStepData?.connectorRef) === MultiTypeInputType.RUNTIME
                ? prevStepData?.connectorRef
                : prevStepData?.connectorRef?.value
              : prevStepData?.identifier
              ? prevStepData?.identifier
              : ''
          })
        }}
      >
        {(formik: { setFieldValue: (a: string, b: string) => void; values: any }) => (
          <Form>
            <div className={helmcss.helmGitForm}>
              <Layout.Vertical padding={{ left: 'xsmall', right: 'xsmall' }}>
                <Layout.Horizontal flex>
                  <div className={cx(stepCss.formGroup, stepCss.md)}>
                    <FormInput.Text
                      name="identifier"
                      label={getString('manifestType.manifestIdentifier')}
                      placeholder={getString('manifestType.manifestPlaceholder')}
                    />
                  </div>

                  <div className={cx(stepCss.formGroup, stepCss.md)}>
                    <FormInput.MultiTextInput
                      name="chartName"
                      multiTextInputProps={{ expressions }}
                      label={getString('manifestType.http.chartName')}
                      placeholder={getString('manifestType.http.chartNamePlaceHolder')}
                    />
                    {getMultiTypeFromValue(formik.values?.chartName) === MultiTypeInputType.RUNTIME && (
                      <ConfigureOptions
                        style={{ alignSelf: 'center' }}
                        value={formik.values?.folderPath as string}
                        type="String"
                        variableName="chartName"
                        showRequiredField={false}
                        showDefaultField={false}
                        showAdvanced={true}
                        onChange={value => formik.setFieldValue('chartName', value)}
                      />
                    )}
                  </div>
                </Layout.Horizontal>
                <Layout.Horizontal flex>
                  <div className={cx(stepCss.formGroup, stepCss.md)}>
                    <FormInput.MultiTextInput
                      name="chartVersion"
                      multiTextInputProps={{ expressions }}
                      label={getString('manifestType.http.chartVersion')}
                      placeholder={getString('manifestType.http.chartVersionPlaceHolder')}
                    />
                    {getMultiTypeFromValue(formik.values?.chartName) === MultiTypeInputType.RUNTIME && (
                      <ConfigureOptions
                        style={{ alignSelf: 'center' }}
                        value={formik.values?.folderPath as string}
                        type="String"
                        variableName="chartVersion"
                        showRequiredField={false}
                        showDefaultField={false}
                        showAdvanced={true}
                        onChange={value => formik.setFieldValue('chartVersion', value)}
                      />
                    )}
                  </div>

                  <div className={cx(stepCss.formGroup, stepCss.md)}>
                    <FormInput.Select name="helmVersion" label={getString('helmVersion')} items={helmVersions} />
                  </div>
                </Layout.Horizontal>

                <Accordion
                  activeId={isActiveAdvancedStep ? getString('advancedTitle') : ''}
                  className={cx({
                    [helmcss.advancedStepOpen]: isActiveAdvancedStep
                  })}
                >
                  <Accordion.Panel
                    id={getString('advancedTitle')}
                    addDomId={true}
                    summary={getString('advancedTitle')}
                    details={
                      <HelmAdvancedStepSection
                        formik={formik}
                        expressions={expressions}
                        commandFlagOptions={
                          formik.values?.helmVersion?.value === 'V2' ? commandFlagOptionsV2 : commandFlagOptionsV3
                        }
                      />
                    }
                  />
                </Accordion>
              </Layout.Vertical>
            </div>

            <Layout.Horizontal spacing="xxlarge" className={css.saveBtn}>
              <Button text={getString('back')} icon="chevron-left" onClick={() => previousStep?.(prevStepData)} />
              <Button intent="primary" type="submit" text={getString('submit')} rightIcon="chevron-right" />
            </Layout.Horizontal>
          </Form>
        )}
      </Formik>
    </Layout.Vertical>
  )
}

export default HelmWithHttp
