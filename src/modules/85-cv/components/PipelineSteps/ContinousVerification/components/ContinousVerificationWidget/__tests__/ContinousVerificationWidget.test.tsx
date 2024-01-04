/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { Formik } from 'formik'
import userEvent from '@testing-library/user-event'
import { MultiTypeInputType } from '@harness/uicore'
import { TestWrapper } from '@common/utils/testUtils'
import { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { validateMonitoredService } from '../ContinousVerificationWidget.utils'
import {
  MockSensitivityComponent,
  expectedErrorsForEmptyTemplateInputs,
  formikMockProps,
  formikMockPropsForSingleService,
  formikMockValues,
  formikMockValuesWithAuto,
  formikMockValuesWithRolling,
  formikMockValuesWithSimpleVerification,
  mockedTemplateInputs,
  mockedTemplateInputsToValidate
} from './ContinousVerificationWidget.mock'
import SelectVerificationType from '../components/ContinousVerificationWidgetSections/components/SelectVerificationType/SelectVerificationType'
import { ContinousVerificationWidgetSections } from '../components/ContinousVerificationWidgetSections/ContinousVerificationWidgetSections'

describe('Unit tests for ContinousVerificationWidget Utils', () => {
  const type = 'Default'
  const stepViewType = StepViewType.Edit
  const monitoredServiceRef = ''
  const errors = {}
  const healthSources: any = []
  const getString = (key: string): string => key
  const monitoredServiceTemplateRef = ''
  const templateInputsToValidate = {}
  const templateInputs = {}
  const isMultiServiesOrEnvs = false

  test('if validateMonitoredService function validates the default monitored service correctly when no monitored service is present', async () => {
    const expectedErrors = {
      spec: {
        monitoredServiceRef: 'Monitored service is required'
      }
    }
    expect(
      validateMonitoredService(
        type,
        stepViewType,
        monitoredServiceRef,
        errors,
        healthSources,
        getString,
        monitoredServiceTemplateRef,
        templateInputsToValidate,
        templateInputs,
        isMultiServiesOrEnvs
      )
    ).toEqual(expectedErrors)
  })

  test('if validateMonitoredService function validates the default monitored service correctly when monitored service is present and health source is not present', async () => {
    const newMonitoredServiceRef = 'splunk_prod'
    const expectedErrors = {
      spec: {
        healthSources: 'platform.connectors.cdng.validations.healthSourceRequired'
      }
    }
    expect(
      validateMonitoredService(
        type,
        stepViewType,
        newMonitoredServiceRef,
        errors,
        healthSources,
        getString,
        monitoredServiceTemplateRef,
        templateInputsToValidate,
        templateInputs,
        isMultiServiesOrEnvs
      )
    ).toEqual(expectedErrors)
  })

  test('if validateMonitoredService function validates the configured monitored service correctly when no monitored service is present', async () => {
    const newType = 'Configured'
    const expectedErrors = {
      spec: {
        monitoredService: {
          spec: {
            monitoredServiceRef: 'Monitored service is required'
          }
        }
      }
    }
    expect(
      validateMonitoredService(
        newType,
        stepViewType,
        monitoredServiceRef,
        errors,
        healthSources,
        getString,
        monitoredServiceTemplateRef,
        templateInputsToValidate,
        templateInputs,
        isMultiServiesOrEnvs
      )
    ).toEqual(expectedErrors)
  })

  test('if validateMonitoredService function validates the configured monitored service correctly when monitored service is present and health source is not present', async () => {
    const newMonitoredServiceRef = 'splunk_prod'
    const expectedErrors = {
      spec: {
        healthSources: 'platform.connectors.cdng.validations.healthSourceRequired'
      }
    }
    expect(
      validateMonitoredService(
        type,
        stepViewType,
        newMonitoredServiceRef,
        errors,
        healthSources,
        getString,
        monitoredServiceTemplateRef,
        templateInputsToValidate,
        templateInputs,
        isMultiServiesOrEnvs
      )
    ).toEqual(expectedErrors)
  })

  test('if validateMonitoredService function validates the templatised monitored service correctly when template is not selected', async () => {
    const templateType = 'Template'
    const expectedErrors = {
      spec: {
        monitoredService: {
          type: 'Template Selection is required.'
        }
      }
    }
    expect(
      validateMonitoredService(
        templateType,
        stepViewType,
        monitoredServiceRef,
        errors,
        healthSources,
        getString,
        monitoredServiceTemplateRef,
        templateInputsToValidate,
        templateInputs,
        isMultiServiesOrEnvs
      )
    ).toEqual(expectedErrors)
  })

  test('if validateMonitoredService function validates the templatised monitored service correctly templateInputs are empty', async () => {
    const templateType = 'Template'
    expect(
      validateMonitoredService(
        templateType,
        stepViewType,
        monitoredServiceRef,
        errors,
        healthSources,
        getString,
        monitoredServiceTemplateRef,
        mockedTemplateInputsToValidate,
        mockedTemplateInputs,
        isMultiServiesOrEnvs
      )
    ).toEqual(expectedErrorsForEmptyTemplateInputs)
  })

  describe('Simple verification', () => {
    test('Should not add Simple verification option if feature flag is disabled', async () => {
      render(
        <TestWrapper>
          <Formik initialValues={formikMockValues.values} onSubmit={jest.fn()}>
            <SelectVerificationType allowableTypes={[MultiTypeInputType.FIXED]} formik={formikMockValues} />
          </Formik>
        </TestWrapper>
      )

      const verificationTypeDropdownInput = screen.getByTestId(/selectedVerificationLabel/)

      expect(verificationTypeDropdownInput).toBeInTheDocument()

      await userEvent.click(verificationTypeDropdownInput!)

      expect(screen.getByText('Rolling Update')).toBeInTheDocument()
      expect(screen.queryByText('pipeline.deploymentType.thresholdAnalysis')).not.toBeInTheDocument()
    })

    test('Should show Simple verification option if feature flag is enabled', async () => {
      render(
        <TestWrapper defaultFeatureFlagValues={{ SRM_ENABLE_SIMPLE_VERIFICATION: true }}>
          <Formik initialValues={formikMockValues.values} onSubmit={jest.fn()}>
            <SelectVerificationType allowableTypes={[MultiTypeInputType.FIXED]} formik={formikMockValues} />
          </Formik>
        </TestWrapper>
      )

      const verificationTypeDropdownInput = screen.getByTestId(/selectedVerificationLabel/)

      expect(verificationTypeDropdownInput).toBeInTheDocument()

      await userEvent.click(verificationTypeDropdownInput!)

      expect(screen.getByText('Rolling Update')).toBeInTheDocument()

      const simpleVerificationOption = screen.getAllByText('pipeline.deploymentType.thresholdAnalysis')[0]

      await waitFor(() => expect(simpleVerificationOption).toBeInTheDocument())

      await userEvent.click(simpleVerificationOption)
    })

    test('should verify whether verification type dropdown is disabled when it is readonly', async () => {
      const { container } = render(
        <TestWrapper defaultFeatureFlagValues={{ SRM_ENABLE_SIMPLE_VERIFICATION: true }}>
          <Formik initialValues={formikMockValues.values} onSubmit={jest.fn()}>
            <SelectVerificationType allowableTypes={[MultiTypeInputType.FIXED]} formik={formikMockValues} readonly />
          </Formik>
        </TestWrapper>
      )

      const verificationTypeDropdownInput = document.querySelector(
        '.disabledStyle[data-testid="selectedVerificationDisplay"]'
      )

      await waitFor(() =>
        expect(screen.getByRole('checkbox', { name: 'platform.connectors.cdng.failOnNoAnalysis' })).toBeDisabled()
      )

      expect(container.querySelector('input[name="spec.spec.sensitivity"]')).toBeDisabled()
      expect(container.querySelector('input[name="spec.spec.duration"]')).toBeDisabled()
      expect(container.querySelector('input[name="spec.spec.deploymentTag"]')).toBeDisabled()

      await waitFor(() => expect(verificationTypeDropdownInput).toBeInTheDocument())
    })

    test('Should render the form based on the deployment type selected', async () => {
      render(
        <TestWrapper defaultFeatureFlagValues={{ SRM_ENABLE_SIMPLE_VERIFICATION: true }}>
          <Formik initialValues={formikMockValuesWithSimpleVerification.values} onSubmit={jest.fn()}>
            <SelectVerificationType
              allowableTypes={[MultiTypeInputType.FIXED]}
              formik={formikMockValuesWithSimpleVerification}
            />
          </Formik>
        </TestWrapper>
      )

      const verificationTypeDropdownInput = screen.getByTestId(/selectedVerificationLabel/)

      expect(verificationTypeDropdownInput).toBeInTheDocument()

      await userEvent.click(verificationTypeDropdownInput!)

      expect(screen.getByText('Rolling Update')).toBeInTheDocument()

      const simpleVerificationOption = screen.getAllByText('pipeline.deploymentType.thresholdAnalysis')[0]

      expect(simpleVerificationOption).toBeInTheDocument()

      await userEvent.click(simpleVerificationOption)

      await waitFor(() => expect(screen.getByTestId(/simpleVerification_form/)).toBeInTheDocument())
    })

    test('Should remove sensitivity and failOnNoAnalysis values when the analysis type is Simple verification', async () => {
      render(
        <TestWrapper defaultFeatureFlagValues={{ SRM_ENABLE_SIMPLE_VERIFICATION: true }}>
          <Formik initialValues={formikMockValuesWithSimpleVerification.values} onSubmit={jest.fn()}>
            <div>
              <SelectVerificationType
                allowableTypes={[MultiTypeInputType.FIXED]}
                formik={formikMockValuesWithSimpleVerification}
              />
              <MockSensitivityComponent />
            </div>
          </Formik>
        </TestWrapper>
      )

      await waitFor(() => expect(screen.queryByTestId(/sensitivity/)).not.toBeInTheDocument())
      await waitFor(() => expect(screen.queryByTestId(/failOnNoAnalysis/)).not.toBeInTheDocument())
    })

    test('Should not remove sensitivity and failOnNoAnalysis values when the analysis type is not Simple verification', async () => {
      render(
        <TestWrapper defaultFeatureFlagValues={{ SRM_ENABLE_SIMPLE_VERIFICATION: true }}>
          <Formik initialValues={formikMockValues.values} onSubmit={jest.fn()}>
            <div>
              <SelectVerificationType allowableTypes={[MultiTypeInputType.FIXED]} formik={formikMockValues} />
              <MockSensitivityComponent />
            </div>
          </Formik>
        </TestWrapper>
      )

      await waitFor(() => expect(screen.getByTestId(/sensitivity/)).toBeInTheDocument())
      await waitFor(() => expect(screen.getByTestId(/failOnNoAnalysis/)).toBeInTheDocument())
    })
  })

  describe('Node filtering', () => {
    test('Should render node filtering if both regex and CD nodes feature flag is disabled', () => {
      render(
        <TestWrapper
          defaultFeatureFlagValues={{
            CV_UI_DISPLAY_NODE_REGEX_FILTER: false,
            CV_UI_DISPLAY_SHOULD_USE_NODES_FROM_CD_CHECKBOX: false
          }}
        >
          <Formik initialValues={formikMockValues.values} onSubmit={jest.fn()}>
            <div>
              <SelectVerificationType allowableTypes={[MultiTypeInputType.FIXED]} formik={formikMockValues} />
            </div>
          </Formik>
        </TestWrapper>
      )

      expect(screen.queryByTestId(/NodeFilteringFields-panel/)).toBeInTheDocument()
    })
    test('Should render node filtering if regex feature flag is enabled', async () => {
      render(
        <TestWrapper
          defaultFeatureFlagValues={{
            CV_UI_DISPLAY_NODE_REGEX_FILTER: true,
            CV_UI_DISPLAY_SHOULD_USE_NODES_FROM_CD_CHECKBOX: false
          }}
        >
          <Formik initialValues={formikMockValuesWithRolling.values} onSubmit={jest.fn()}>
            <div>
              <SelectVerificationType
                allowableTypes={[MultiTypeInputType.FIXED]}
                formik={formikMockValuesWithRolling}
              />
            </div>
          </Formik>
        </TestWrapper>
      )

      expect(screen.getByTestId(/NodeFilteringFields-panel/)).toBeInTheDocument()

      await userEvent.click(screen.getByText(/projectsOrgs.optional/))

      await waitFor(() =>
        expect(screen.getByPlaceholderText(/cv.verifyStep.controlNodePlaceholder/)).toBeInTheDocument()
      )
      await waitFor(() => expect(screen.getByPlaceholderText(/cv.verifyStep.testNodePlaceholder/)).toBeInTheDocument())

      await waitFor(() => expect(document.querySelector('input[name="spec.spec.shouldUseCDNodes"]')).toBeNull())
    })

    test('Should render node filtering if should use nodes from CD feature flag is enabled', async () => {
      render(
        <TestWrapper
          defaultFeatureFlagValues={{
            CV_UI_DISPLAY_SHOULD_USE_NODES_FROM_CD_CHECKBOX: true,
            CV_UI_DISPLAY_NODE_REGEX_FILTER: false
          }}
        >
          <Formik initialValues={formikMockValuesWithRolling.values} onSubmit={jest.fn()}>
            <div>
              <SelectVerificationType
                allowableTypes={[MultiTypeInputType.FIXED]}
                formik={formikMockValuesWithRolling}
              />
            </div>
          </Formik>
        </TestWrapper>
      )

      expect(screen.getByTestId(/NodeFilteringFields-panel/)).toBeInTheDocument()

      await userEvent.click(screen.getByText(/projectsOrgs.optional/))

      await waitFor(() =>
        expect(document.querySelector('input[name="spec.spec.shouldUseCDNodes"]')).toBeInTheDocument()
      )
      await waitFor(() =>
        expect(screen.queryByPlaceholderText(/cv.verifyStep.testNodePlaceholder/)).not.toBeInTheDocument()
      )
    })

    test('Should render node filtering with all the fields if use nodes from CD and regex feature flags are enabled', async () => {
      render(
        <TestWrapper
          defaultFeatureFlagValues={{
            CV_UI_DISPLAY_SHOULD_USE_NODES_FROM_CD_CHECKBOX: true,
            CV_UI_DISPLAY_NODE_REGEX_FILTER: true
          }}
        >
          <Formik initialValues={formikMockValuesWithRolling.values} onSubmit={jest.fn()}>
            <div>
              <SelectVerificationType
                allowableTypes={[MultiTypeInputType.FIXED]}
                formik={formikMockValuesWithRolling}
              />
            </div>
          </Formik>
        </TestWrapper>
      )

      expect(screen.getByTestId(/NodeFilteringFields-panel/)).toBeInTheDocument()

      await userEvent.click(screen.getByText(/projectsOrgs.optional/))

      await waitFor(() =>
        expect(document.querySelector('input[name="spec.spec.shouldUseCDNodes"]')).toBeInTheDocument()
      )
      await waitFor(() => expect(screen.getByPlaceholderText(/cv.verifyStep.testNodePlaceholder/)).toBeInTheDocument())
    })

    test('Should render node filtering with use nodes from CD checkbox alone and regex has to be hidden if Auto type is selected and checkbox FF is enavled', async () => {
      render(
        <TestWrapper
          defaultFeatureFlagValues={{
            CV_UI_DISPLAY_SHOULD_USE_NODES_FROM_CD_CHECKBOX: true,
            CV_UI_DISPLAY_NODE_REGEX_FILTER: true
          }}
        >
          <Formik initialValues={formikMockValuesWithAuto.values} onSubmit={jest.fn()}>
            <div>
              <SelectVerificationType allowableTypes={[MultiTypeInputType.FIXED]} formik={formikMockValuesWithAuto} />
            </div>
          </Formik>
        </TestWrapper>
      )

      expect(screen.getByTestId(/NodeFilteringFields-panel/)).toBeInTheDocument()

      await userEvent.click(screen.getByText(/projectsOrgs.optional/))

      await waitFor(() =>
        expect(document.querySelector('input[name="spec.spec.shouldUseCDNodes"]')).toBeInTheDocument()
      )
      await waitFor(() =>
        expect(screen.queryByPlaceholderText(/cv.verifyStep.testNodePlaceholder/)).not.toBeInTheDocument()
      )
    })

    test('Should render optional accordion if Auto type is selected and nodes from CD FF is disabled', async () => {
      render(
        <TestWrapper
          defaultFeatureFlagValues={{
            CV_UI_DISPLAY_SHOULD_USE_NODES_FROM_CD_CHECKBOX: false,
            CV_UI_DISPLAY_NODE_REGEX_FILTER: true
          }}
        >
          <Formik initialValues={formikMockValuesWithAuto.values} onSubmit={jest.fn()}>
            <div>
              <SelectVerificationType allowableTypes={[MultiTypeInputType.FIXED]} formik={formikMockValuesWithAuto} />
            </div>
          </Formik>
        </TestWrapper>
      )

      expect(screen.queryByTestId(/NodeFilteringFields-panel/)).toBeInTheDocument()
    })

    test('Should render node filtering if SimpleVerification deployment type is chosen', () => {
      render(
        <TestWrapper
          defaultFeatureFlagValues={{
            CV_UI_DISPLAY_NODE_REGEX_FILTER: true,
            CV_UI_DISPLAY_SHOULD_USE_NODES_FROM_CD_CHECKBOX: true
          }}
        >
          <Formik initialValues={formikMockValuesWithSimpleVerification.values} onSubmit={jest.fn()}>
            <div>
              <SelectVerificationType
                allowableTypes={[MultiTypeInputType.FIXED]}
                formik={formikMockValuesWithSimpleVerification}
              />
            </div>
          </Formik>
        </TestWrapper>
      )

      expect(screen.queryByTestId(/NodeFilteringFields-panel/)).toBeInTheDocument()
    })
  })

  describe('Fail if any custom metrics fails', () => {
    test('Should render optional accordion', async () => {
      render(
        <TestWrapper>
          <Formik initialValues={formikMockValuesWithSimpleVerification.values} onSubmit={jest.fn()}>
            <div>
              <SelectVerificationType
                allowableTypes={[MultiTypeInputType.FIXED]}
                formik={formikMockValuesWithSimpleVerification}
              />
            </div>
          </Formik>
        </TestWrapper>
      )

      await waitFor(() => expect(screen.getByTestId(/NodeFilteringFields-panel/)).toBeInTheDocument())

      await userEvent.click(screen.getByText(/projectsOrgs.optional/))

      await waitFor(() =>
        expect(document.querySelector('input[name="spec.spec.failIfAnyCustomMetricInNoAnalysis"]')).toBeInTheDocument()
      )
    })
  })

  describe('Multi service or Environment deploy', () => {
    test('Should not render health sources if the stage is deploying multiple services or environments', () => {
      render(
        <TestWrapper defaultFeatureFlagValues={{ CVNG_TEMPLATE_VERIFY_STEP: true }}>
          <Formik initialValues={formikMockValuesWithSimpleVerification.values} onSubmit={jest.fn()}>
            <ContinousVerificationWidgetSections allowableTypes={[]} formik={formikMockProps} isNewStep={false} />
          </Formik>
        </TestWrapper>
      )
      expect(screen.getByText(/cv.verifyStep.monitoredServiceMultipleServiceEnvHideMessge/)).toBeInTheDocument()
    })

    test('Should render health sources if the stage is deploying single service or environment', () => {
      render(
        <TestWrapper defaultFeatureFlagValues={{ CVNG_TEMPLATE_VERIFY_STEP: true }}>
          <Formik initialValues={formikMockValuesWithSimpleVerification.values} onSubmit={jest.fn()}>
            <ContinousVerificationWidgetSections
              allowableTypes={[]}
              formik={formikMockPropsForSingleService}
              isNewStep={false}
            />
          </Formik>
        </TestWrapper>
      )
      expect(screen.queryByText(/cv.verifyStep.monitoredServiceMultipleServiceEnvHideMessge/)).not.toBeInTheDocument()
    })
  })
})
