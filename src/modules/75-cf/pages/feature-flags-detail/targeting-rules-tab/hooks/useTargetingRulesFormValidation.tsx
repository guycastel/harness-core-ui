/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import * as yup from 'yup'
import { FormikErrors, validateYupSchema, yupToFormErrors } from 'formik'
import { useStrings } from 'framework/strings'
import { getPercentageRolloutVariationsArrayTest } from '@cf/hooks/usePercentageRolloutValidationSchema'
import {
  FormVariationMap,
  TargetingRuleItemStatus,
  TargetingRulesFormValues,
  VariationPercentageRollout
} from '../types'

interface UseTargetingRulesFormValidationReturn {
  validate: (values: TargetingRulesFormValues) => FormikErrors<unknown>
}

const useTargetingRulesFormValidation = (): UseTargetingRulesFormValidationReturn => {
  const { getString } = useStrings()

  const validate = (values: TargetingRulesFormValues): FormikErrors<unknown> => {
    try {
      validateYupSchema(
        values,
        yup.object({
          targetingRuleItems: yup.array().of(
            yup.lazy(v => {
              if ((v as FormVariationMap | VariationPercentageRollout).status === TargetingRuleItemStatus.DELETED) {
                return yup.object({})
              }

              const validations: Record<string, yup.Schema<unknown>> = {
                clauses: yup.array().of(
                  yup.object({
                    values: yup
                      .array()
                      .of(yup.string().required(getString('cf.featureFlags.rules.validation.selectTargetGroup')))
                  })
                )
              }

              if ('variations' in (v as VariationPercentageRollout)) {
                validations.variations = getPercentageRolloutVariationsArrayTest(getString)
              }

              if ('targets' in (v as FormVariationMap) || 'targetGroups' in (v as FormVariationMap)) {
                return yup.object({
                  targets: (v as FormVariationMap).targetGroups?.length
                    ? yup.array().optional()
                    : yup.array().required(getString('cf.featureFlags.rules.validation.selectTarget')),
                  targetGroups: (v as FormVariationMap).targets?.length
                    ? yup.array().optional()
                    : yup.array().required(getString('cf.featureFlags.rules.validation.selectTargetGroup'))
                })
              } else {
                return yup.object({
                  clauses: yup.array().of(
                    yup.object({
                      values: yup
                        .array()
                        .of(yup.string().required(getString('cf.featureFlags.rules.validation.selectTargetGroup')))
                    })
                  ),
                  variations: getPercentageRolloutVariationsArrayTest(getString)
                })
              }
            })
          )
        }),
        true,
        values
      )
    } catch (err) {
      return yupToFormErrors(err) //for rendering validation errors
    }

    return {}
  }

  return {
    validate
  }
}

export default useTargetingRulesFormValidation
