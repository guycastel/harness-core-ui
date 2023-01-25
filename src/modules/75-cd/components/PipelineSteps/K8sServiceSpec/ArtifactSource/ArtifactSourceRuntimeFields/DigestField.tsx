/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useState } from 'react'
import { get, memoize } from 'lodash-es'

import { getMultiTypeFromValue, MultiTypeInputType, SelectOption, Text, useToaster } from '@harness/uicore'
import type { GetDataError } from 'restful-react'
import type { IItemRendererProps } from '@blueprintjs/select'
import { EXPRESSION_STRING } from '@pipeline/utils/constants'
import { useStrings } from 'framework/strings'
import type { ArtifactSourceRenderProps } from '@cd/factory/ArtifactSourceFactory/ArtifactSourceBase'
import { ConfigureOptions } from '@common/components/ConfigureOptions/ConfigureOptions'
import type { StepViewType } from '@pipeline/components/AbstractSteps/Step'
import { SelectInputSetView } from '@pipeline/components/InputSetView/SelectInputSetView/SelectInputSetView'
import type { Failure } from 'services/cd-ng'
import ItemRendererWithMenuItem from '@common/components/ItemRenderer/ItemRendererWithMenuItem'
import { BuildDetailsDTO, getTagError, isExecutionTimeFieldDisabled } from '../artifactSourceUtils'
import css from '../../../Common/GenericServiceSpec/GenericServiceSpec.module.scss'

interface DigestFieldProps extends ArtifactSourceRenderProps {
  buildDetailsList?: BuildDetailsDTO
  fetchingDigest: boolean
  fetchDigest: () => void
  fetchDigestError: GetDataError<Failure | Error> | null
  expressions: string[]
  digestData: any
}
const DigestField = (props: DigestFieldProps): JSX.Element => {
  const {
    formik,
    path,
    readonly,
    expressions,
    allowableTypes,
    artifactPath,
    fetchingDigest,
    fetchDigest,
    fetchDigestError,
    stageIdentifier,
    stepViewType,
    digestData
  } = props

  const { getString } = useStrings()

  const { showError } = useToaster()
  const loadingPlaceholderText = getString('pipeline.artifactsSelection.loadingDigest')
  const digestDefaultValue = [{ label: loadingPlaceholderText, value: loadingPlaceholderText }]

  const [digestList, setDigestList] = useState<SelectOption[]>(digestDefaultValue)

  useEffect(() => {
    if (fetchDigestError) {
      showError(`Stage ${stageIdentifier}: ${getTagError(fetchDigestError)}`, undefined, 'cd.tag.fetch.error')
    }
  }, [fetchDigestError, showError, stageIdentifier])

  useEffect(() => {
    if (digestData && !fetchingDigest) {
      const options = []
      if (digestData && digestData?.data && digestData?.data?.metadata && digestData?.data?.metadata?.SHA) {
        options.push({ label: digestData.data.metadata.SHA, value: digestData.data.metadata.SHA })
      }
      if (digestData && digestData?.data && digestData?.data?.metadata && digestData?.data?.metadata?.SHAV2) {
        options.push({ label: digestData.data.metadata.SHAV2, value: digestData.data.metadata.SHAV2 })
      }
      setDigestList(options)
    }
  }, [digestData, fetchingDigest])

  const itemRenderer = memoize((item: SelectOption, itemProps: IItemRendererProps) => (
    <ItemRendererWithMenuItem item={item} itemProps={itemProps} disabled={fetchingDigest} />
  ))

  return (
    <div className={css.inputFieldLayout}>
      <SelectInputSetView
        formik={formik}
        selectItems={
          fetchingDigest
            ? [
                {
                  label: getString('pipeline.artifactsSelection.loadingDigest'),
                  value: getString('pipeline.artifactsSelection.loadingDigest')
                }
              ]
            : digestList
        }
        useValue
        multiTypeInputProps={{
          onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
            /* istanbul ignore next */
            if (
              e?.target?.type !== 'text' ||
              (e?.target?.type === 'text' && e?.target?.placeholder === EXPRESSION_STRING)
            ) {
              return
            }

            fetchDigest()
          },
          selectProps: {
            items: fetchingDigest
              ? [
                  {
                    label: getString('pipeline.artifactsSelection.loadingDigest'),
                    value: getString('pipeline.artifactsSelection.loadingDigest')
                  }
                ]
              : digestList,
            usePortal: true,
            addClearBtn: !readonly,
            noResults: <Text lineClamp={1}>{getTagError(fetchDigestError)}</Text>,
            itemRenderer,
            allowCreatingNewItems: true,
            popoverClassName: css.selectPopover,
            loadingItems: fetchingDigest
          },
          expressions,
          allowableTypes
        }}
        label={getString('pipeline.digest')}
        name={`${path}.artifacts.${artifactPath}.spec.digest`}
        fieldPath={''}
        template={undefined}
      />
      {getMultiTypeFromValue(
        get(
          formik?.values,

          `${path}.artifacts.${artifactPath}.spec.digest`
        )
      ) === MultiTypeInputType.RUNTIME && (
        <ConfigureOptions
          className={css.configureOptions}
          style={{ alignSelf: 'center' }}
          value={get(formik?.values, `${path}.artifacts.${artifactPath}.spec.digest`)}
          type="String"
          variableName="digest"
          showRequiredField={false}
          isReadonly={readonly}
          showDefaultField={true}
          isExecutionTimeFieldDisabled={isExecutionTimeFieldDisabled(stepViewType as StepViewType)}
          showAdvanced={true}
          onChange={value => {
            formik.setFieldValue(`${path}.artifacts.${artifactPath}.spec.digest`, value)
          }}
        />
      )}
    </div>
  )
}

export default DigestField