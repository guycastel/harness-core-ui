/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useFormikContext } from 'formik'
import { get } from 'lodash-es'
import { FormInput, MultiTypeInputType, getMultiTypeFromValue } from '@harness/uicore'
import type { SelectWithBiLevelOption } from '@harness/uicore/dist/components/Select/BiLevelSelect'
import { IItemRendererProps } from '@blueprintjs/select'
import { IconName } from '@blueprintjs/core'
import { useStrings } from 'framework/strings'
import { JobDetails, useGetJobDetailsForJenkins } from 'services/cd-ng'
import { GitQueryParams } from '@common/interfaces/RouteInterfaces'
import { useQueryParams } from '@common/hooks'
import ItemRendererWithMenuItem from '@common/components/ItemRenderer/ItemRendererWithMenuItem'
import { useRuntimeInput } from '@modules/70-pipeline/y1/hooks/useRuntimeInput'
import { InputsFormValues } from '../../InputsForm/InputsForm'
import { InputComponent, InputProps } from '../InputComponent'
import { DerivedInputType } from '../InputComponentType'
import { useInputDependencies } from '../../InputsForm/hooks/useInputDependencies'
import { RuntimeInputType } from '../../InputsForm/types'

function JenkinsJobNameInternal(props: InputProps<InputsFormValues>): JSX.Element {
  const { allowableTypes, readonly, path, input } = props
  const { getString } = useStrings()
  const { accountId, projectIdentifier, orgIdentifier } = useParams<{
    projectIdentifier: string
    orgIdentifier: string
    accountId: string
  }>()
  const { repoIdentifier, branch } = useQueryParams<GitQueryParams>()
  const inputDependencies = useInputDependencies(input.dependencies ?? [])
  const { values, setFieldValue } = useFormikContext()
  const lastOpenedJob = useRef<string>()
  const [jobDetails, setJobDetails] = useState<SelectWithBiLevelOption[]>([])
  const [showChildJobField, setShowChildJobField] = useState<boolean>(false)
  const [jobDetailsType, setJobDetailsType] = useState<MultiTypeInputType>(getMultiTypeFromValue(get(values, path)))
  const [childJob, setChildJob] = useState<SelectWithBiLevelOption>({} as SelectWithBiLevelOption)

  const connectorRef = inputDependencies?.connectorRef as string | undefined

  const getJobItems = (jobs: JobDetails[]): SelectWithBiLevelOption[] => {
    return jobs?.map(job => {
      return {
        label: job.jobName || '',
        value: job.url || '',
        submenuItems: [],
        hasSubmenuItems: job.folder
      }
    })
  }

  const getJobnameValue = (): SelectWithBiLevelOption => {
    const jobName = get(values, path)

    if (jobDetailsType !== MultiTypeInputType.FIXED) return jobName
    if (showChildJobField) {
      const parentJob = jobDetails.find(job => job.label === lastOpenedJob?.current)
      if (parentJob) return parentJob
    }
    const jobDetail = jobDetails.find(job => job.label === jobName)
    if (jobDetail && jobDetailsType === MultiTypeInputType.FIXED) return jobDetail
    return {
      label: jobName,
      value: jobName,
      submenuItems: [],
      hasSubmenuItems: false
    } as SelectWithBiLevelOption
  }

  const childJobDetails = (): SelectWithBiLevelOption[] => {
    if (showChildJobField && lastOpenedJob.current) {
      const childJobs: SelectWithBiLevelOption[] =
        jobDetails.find(item => item.label === lastOpenedJob.current)?.submenuItems || []
      return childJobs
    }
    return []
  }

  const commonParams = {
    accountIdentifier: accountId,
    projectIdentifier,
    orgIdentifier,
    repoIdentifier,
    branch
  }

  const {
    refetch: refetchJobs,
    data: jobsResponse,
    loading: fetchingJobs,
    error: fetchingJobsError
  } = useGetJobDetailsForJenkins({
    lazy: !(connectorRef && getMultiTypeFromValue(connectorRef) === MultiTypeInputType.FIXED),
    queryParams: {
      ...commonParams,
      connectorRef
    }
  })

  useEffect(() => {
    if (lastOpenedJob.current) {
      setJobDetails((prevState: SelectWithBiLevelOption[]) => {
        const clonedJobDetails = [...prevState]
        const probableParentName = jobsResponse?.data?.jobDetails?.[0]?.jobName?.split('/')?.[0]
        const parentJob = clonedJobDetails.find(obj => obj.label === probableParentName)
        if (parentJob) {
          parentJob.submenuItems = [...getJobItems(jobsResponse?.data?.jobDetails || [])]
        }
        return clonedJobDetails
      })
    } else {
      const jobs = jobsResponse?.data?.jobDetails?.map(job => {
        return {
          label: job.jobName || '',
          value: job.url || '',
          submenuItems: [],
          hasSubmenuItems: job.folder
        }
      })
      setJobDetails(jobs || [])
    }
  }, [jobsResponse])

  useEffect(() => {
    const jobName = get(values, path)
    if (jobName?.split('/').length > 1 && jobDetails.length) {
      setShowChildJobField(true)
      const parentJobName = jobName?.split('/')[0]
      lastOpenedJob.current = parentJobName
      const parentJob = jobDetails?.find(job => job.label === parentJobName)
      if (!parentJob?.submenuItems?.length) {
        refetchJobs({
          queryParams: {
            ...commonParams,
            connectorRef: connectorRef?.toString(),
            parentJobName
          }
        })
      } else {
        const targetChildJob = parentJob.submenuItems?.find(job => job.label === jobName)
        setChildJob(targetChildJob as SelectWithBiLevelOption)
      }
    }
  }, [jobDetails])

  const jobNameRenderer = (item: SelectWithBiLevelOption, itemProps: IItemRendererProps): JSX.Element => (
    <ItemRendererWithMenuItem
      item={item}
      itemProps={itemProps}
      disabled={fetchingJobs}
      icon={item?.hasSubmenuItems ? 'folder-open' : ('file' as IconName)}
    />
  )

  const getPlaceholder = (): string => {
    if (!(connectorRef && getMultiTypeFromValue(connectorRef) === MultiTypeInputType.FIXED)) {
      return getString('select')
    }
    if (fetchingJobs) {
      return getString('common.loadingFieldOptions', { fieldName: getString('pipeline.jenkinsStep.job') })
    }
    if (fetchingJobsError?.message) {
      return fetchingJobsError?.message
    }
    return getString('select')
  }

  const { renderRuntimeInput } = useRuntimeInput({ type: RuntimeInputType.string })

  return (
    <>
      <FormInput.MultiTypeBiLevelInput
        label={getString('platform.connectors.jenkins.jobNameLabel')}
        name={path}
        value={getJobnameValue()}
        placeholder={getPlaceholder()}
        multiTypeInputProps={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange: (primaryValue: any) => {
            if (primaryValue?.hasSubmenuItems) {
              setShowChildJobField(true)
              lastOpenedJob.current = primaryValue?.label
              const parentJob = jobDetails?.find(job => job.label === primaryValue?.label)
              if (!parentJob?.submenuItems?.length) {
                refetchJobs({
                  queryParams: {
                    ...commonParams,
                    connectorRef: connectorRef?.toString(),
                    parentJobName: primaryValue?.label
                  }
                })
              }
            } else {
              setShowChildJobField(false)
            }
            setChildJob({} as SelectWithBiLevelOption)
            setFieldValue(
              path,
              getMultiTypeFromValue(primaryValue) === MultiTypeInputType.FIXED ? primaryValue?.label : primaryValue
            )
          },
          onTypeChange: (type: MultiTypeInputType) => setJobDetailsType(type),
          expressions: [], // TODO: send expressions
          selectProps: {
            allowCreatingNewItems: true,
            items: jobDetails,
            addClearBtn: !readonly,
            itemRenderer: jobNameRenderer
          },
          allowableTypes,
          renderRuntimeInput
        }}
        selectItems={jobDetails || []}
      />
      {showChildJobField && (
        <FormInput.MultiTypeBiLevelInput
          label={`${lastOpenedJob.current || getString('platform.connectors.jenkins.child')} ${getString(
            'platform.connectors.jenkins.jobs'
          )}`}
          name={path}
          value={childJob}
          placeholder={getPlaceholder()}
          multiTypeInputProps={{
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange: (primaryValue: any) => {
              if (primaryValue?.hasSubmenuItems) {
                lastOpenedJob.current = primaryValue?.label
                const parentJob = jobDetails?.find(job => job.label === primaryValue?.label)
                if (!parentJob?.submenuItems?.length) {
                  return refetchJobs({
                    queryParams: {
                      ...commonParams,
                      connectorRef: connectorRef?.toString(),
                      parentJobName: primaryValue?.label
                    }
                  })
                }
              }
              setChildJob(primaryValue)
              setFieldValue(
                path,
                getMultiTypeFromValue(primaryValue) === MultiTypeInputType.FIXED ? primaryValue?.label : primaryValue
              )
            },
            expressions: [],
            selectProps: {
              allowCreatingNewItems: false,
              items: childJobDetails(),
              addClearBtn: false,
              itemRenderer: jobNameRenderer
            },
            allowableTypes: [MultiTypeInputType.FIXED]
          }}
          selectItems={childJobDetails() || []}
        />
      )}
    </>
  )
}

export class JenkinsJobNameInput extends InputComponent<InputsFormValues> {
  public internalType = DerivedInputType.jenkins_job_name

  constructor() {
    super()
  }

  renderComponent(props: InputProps<InputsFormValues>): JSX.Element {
    return <JenkinsJobNameInternal {...props} />
  }
}
