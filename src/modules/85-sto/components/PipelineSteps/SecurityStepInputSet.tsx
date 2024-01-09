/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { getMultiTypeFromValue, MultiTypeInputType, FormikForm, AllowedTypes } from '@harness/uicore'
import { connect } from 'formik'
import { isEmpty } from 'lodash-es'
import StepCommonFieldsInputSet from '@ci/components/PipelineSteps/StepCommonFields/StepCommonFieldsInputSet'
import { CIStep } from '@ci/components/PipelineSteps/CIStep/CIStep'
import {
  CIStepOptionalConfig,
  CIStepOptionalConfigProps
} from '@ci/components/PipelineSteps/CIStep/CIStepOptionalConfig'
import { shouldRenderRunTimeInputView } from '@pipeline/utils/CIUtils'
import type { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { AllMultiTypeInputTypesForInputSet } from '@ci/components/PipelineSteps/CIStep/StepUtils'
import { getInputSetFieldName } from './constants'
import { InputSetFields } from './SecurityFields'
import type { SecurityStepData, SecurityStepSpec } from './types'
import type { CustomTooltipFieldProps } from './SecurityField'
import css from '@pipeline/components/PipelineSteps/Steps/Steps.module.scss'

export interface SecurityStepProps {
  initialValues: SecurityStepData<SecurityStepSpec>
  template?: SecurityStepData<SecurityStepSpec>
  path?: string
  isNewStep?: boolean
  readonly?: boolean
  stepViewType: StepViewType
  onUpdate?: (data: SecurityStepData<SecurityStepSpec>) => void
  onChange?: (data: SecurityStepData<SecurityStepSpec>) => void
  allowableTypes: AllowedTypes
  formik?: any
  toolTipOverrides?: CustomTooltipFieldProps
}

const SecurityStepInputSetBasic: React.FC<SecurityStepProps> = ({
  template,
  path,
  readonly,
  stepViewType,
  allowableTypes,
  formik,
  toolTipOverrides
}) => {
  const prefix = isEmpty(path) ? '' : `${path}.`

  const enableFields: CIStepOptionalConfigProps['enableFields'] = {
    ...(shouldRenderRunTimeInputView(template?.spec?.settings) && {
      [getInputSetFieldName(prefix, 'spec.settings')]: {}
    })
  }

  return (
    <FormikForm className={css.removeBpPopoverWrapperTopMargin}>
      <CIStep
        readonly={readonly}
        stepViewType={stepViewType}
        allowableTypes={allowableTypes}
        enableFields={{
          ...(getMultiTypeFromValue(template?.description) === MultiTypeInputType.RUNTIME && {
            description: {}
          })
        }}
        path={path || ''}
        isInputSetView={true}
        template={template}
      />
      <InputSetFields
        readonly={readonly}
        allowableTypes={AllMultiTypeInputTypesForInputSet}
        formik={formik}
        prefix={prefix}
        template={template}
        toolTipOverrides={toolTipOverrides}
      />
      <CIStepOptionalConfig
        readonly={readonly}
        enableFields={enableFields}
        allowableTypes={allowableTypes}
        stepViewType={stepViewType}
        path={path || ''}
        formik={formik}
        isInputSetView={true}
        template={template}
      />
      <StepCommonFieldsInputSet
        path={path}
        readonly={readonly}
        template={template}
        allowableTypes={allowableTypes}
        stepViewType={stepViewType}
      />
    </FormikForm>
  )
}

const SecurityStepInputSet = connect(SecurityStepInputSetBasic)
export { SecurityStepInputSet }
