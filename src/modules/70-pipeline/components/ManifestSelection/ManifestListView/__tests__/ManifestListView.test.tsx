/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { TestWrapper, queryByNameAttribute } from '@common/utils/testUtils'

import ManifestListView from '../ManifestListView'
import {
  awsRegionListResponse,
  dummyBucketListResponse,
  manifestsPropsForServerlessLambda,
  manifestsPropsForServerlessLambdaWithExistingList
} from './mock'
import { ManifestListViewProps } from '../../ManifestInterface'

jest.mock('@common/components/YAMLBuilder/YamlBuilder')

const fetchConnectors = (): Promise<unknown> => Promise.resolve({})

jest.mock('services/cd-ng', () => ({
  useGetConnectorListV2: jest.fn().mockImplementation(() => ({ mutate: fetchConnectors })),
  useGetServiceV2: jest.fn().mockImplementation(() => ({ loading: false, data: {}, refetch: jest.fn() })),
  useGetConnector: jest.fn().mockImplementation(() => {
    return { data: {}, refetch: jest.fn(), error: null }
  }),
  useGetV2BucketListForS3: jest.fn().mockImplementation(() => {
    return {
      data: dummyBucketListResponse,
      refetch: jest.fn(),
      error: null
    }
  })
}))

jest.mock('services/portal', () => ({
  useListAwsRegions: jest.fn().mockImplementation(() => {
    return {
      data: awsRegionListResponse,
      refetch: jest.fn(),
      error: null,
      loading: false
    }
  })
}))

const props = {
  ...manifestsPropsForServerlessLambda,
  updateManifestList: jest.fn(),
  removeValuesYaml: jest.fn(),
  removeManifestConfig: jest.fn(),
  attachPathYaml: jest.fn()
}
describe('Verify manifest list view component', () => {
  test(`Should not show S3 store option for ServerlessAwsLambda > manifest type: ServerlessAwsLambda when feature flag is false`, async () => {
    const { getByText, queryByText } = render(
      <TestWrapper
        defaultFeatureFlagValues={{
          CDS_CONTAINER_STEP_GROUP_AWS_S3_DOWNLOAD: false
        }}
      >
        <ManifestListView {...(props as ManifestListViewProps)} deploymentType={'ServerlessAwsLambda'} />
      </TestWrapper>
    )

    const addManifestBtn = getByText('pipeline.manifestType.addManifestLabel')
    expect(addManifestBtn).toBeInTheDocument()
    await userEvent.click(addManifestBtn)
    // open manifest create form
    await waitFor(() => {
      const modals = document.getElementsByClassName('bp3-dialog')
      const manifestModal = modals[0]! as HTMLElement
      expect(manifestModal).toBeInTheDocument()
    })
    // select serverlessLambdaManifest Element
    const serverlessLambdaManifestElement = getByText('pipeline.manifestTypeLabels.ServerlessAwsLambda')
    expect(getByText('pipeline.manifestTypeLabels.ServerlessAwsLambda')).toBeInTheDocument()
    await userEvent.click(serverlessLambdaManifestElement)

    // click on continue button
    expect(getByText('continue')).toBeInTheDocument()
    act(async () => {
      await userEvent.click(getByText('continue'))
    })
    // wait for opening select store form with correct fields
    await waitFor(() => {
      expect(getByText('pipeline.manifestTypeLabels.ServerlessAwsLambda')).toBeInTheDocument()
      expect(getByText('pipeline.manifestType.gitConnectorLabel')).toBeInTheDocument()
      expect(getByText('common.repo_provider.githubLabel')).toBeInTheDocument()
      expect(getByText('common.repo_provider.gitlabLabel')).toBeInTheDocument()
      expect(getByText('common.repo_provider.bitbucketLabel')).toBeInTheDocument()
      expect(getByText('pipeline.manifestType.azureRepoConnectorLabel')).toBeInTheDocument()
      expect(queryByText('platform.connectors.S3')).not.toBeInTheDocument()
    })
  })

  test(`Should show S3 store option for ServerlessAwsLambda > manifest type: ServerlessAwsLambda when feature flag is true`, async () => {
    const { getByText } = render(
      <TestWrapper
        defaultFeatureFlagValues={{
          CDS_CONTAINER_STEP_GROUP_AWS_S3_DOWNLOAD: true
        }}
      >
        <ManifestListView {...(props as ManifestListViewProps)} deploymentType={'ServerlessAwsLambda'} />
      </TestWrapper>
    )

    const addManifestBtn = getByText('pipeline.manifestType.addManifestLabel')
    expect(addManifestBtn).toBeInTheDocument()
    await userEvent.click(addManifestBtn)
    // open manifest create form
    await waitFor(() => {
      const modals = document.getElementsByClassName('bp3-dialog')
      const manifestModal = modals[0]! as HTMLElement
      expect(manifestModal).toBeInTheDocument()
    })
    // select serverlessLambdaManifest Element
    const serverlessLambdaManifestElement = getByText('pipeline.manifestTypeLabels.ServerlessAwsLambda')
    expect(getByText('pipeline.manifestTypeLabels.ServerlessAwsLambda')).toBeInTheDocument()
    await userEvent.click(serverlessLambdaManifestElement)
    expect(getByText('continue')).toBeInTheDocument()

    // click on continue button
    act(async () => {
      await userEvent.click(getByText('continue'))
    })

    // wait for opening select store form with correct fields
    await waitFor(() => {
      expect(getByText('pipeline.manifestTypeLabels.ServerlessAwsLambda')).toBeInTheDocument()
      expect(getByText('pipeline.manifestType.gitConnectorLabel')).toBeInTheDocument()
      expect(getByText('common.repo_provider.githubLabel')).toBeInTheDocument()
      expect(getByText('common.repo_provider.gitlabLabel')).toBeInTheDocument()
      expect(getByText('common.repo_provider.bitbucketLabel')).toBeInTheDocument()
      expect(getByText('pipeline.manifestType.azureRepoConnectorLabel')).toBeInTheDocument()
      expect(getByText('platform.connectors.S3')).toBeInTheDocument()
    })
  })

  test(`Should show S3 store option for ServerlessAwsLambda > manifest type: Values when feature flag is false`, async () => {
    const { getByText, queryByText } = render(
      <TestWrapper
        defaultFeatureFlagValues={{
          CDS_CONTAINER_STEP_GROUP_AWS_S3_DOWNLOAD: false
        }}
      >
        <ManifestListView {...(props as ManifestListViewProps)} deploymentType={'ServerlessAwsLambda'} />
      </TestWrapper>
    )

    const addManifestBtn = getByText('pipeline.manifestType.addManifestLabel')
    expect(addManifestBtn).toBeInTheDocument()

    // open manifest create form
    await userEvent.click(addManifestBtn)
    await waitFor(() => {
      const modals = document.getElementsByClassName('bp3-dialog')
      const manifestModal = modals[0]! as HTMLElement
      expect(manifestModal).toBeInTheDocument()
    })

    // select valuesManifest Element
    const valuesManifestElement = getByText('pipeline.manifestTypeLabels.ValuesYaml')
    expect(valuesManifestElement).toBeInTheDocument()
    await userEvent.click(valuesManifestElement)
    expect(getByText('continue')).toBeInTheDocument()

    // click on continue button
    act(async () => {
      await userEvent.click(getByText('continue'))
    })

    // wait for opening select store form with correct fields
    await waitFor(() => {
      expect(getByText('pipeline.manifestTypeLabels.ValuesYaml')).toBeInTheDocument()
      expect(getByText('pipeline.manifestType.gitConnectorLabel')).toBeInTheDocument()
      expect(getByText('common.repo_provider.githubLabel')).toBeInTheDocument()
      expect(getByText('common.repo_provider.gitlabLabel')).toBeInTheDocument()
      expect(getByText('common.repo_provider.bitbucketLabel')).toBeInTheDocument()
      expect(getByText('pipeline.manifestType.azureRepoConnectorLabel')).toBeInTheDocument()
      expect(queryByText('platform.connectors.S3')).not.toBeInTheDocument()
    })
  })

  test(`Should show S3 store option for ServerlessAwsLambda > manifest type: Values when feature flag is true`, async () => {
    const { getByText } = render(
      <TestWrapper
        defaultFeatureFlagValues={{
          CDS_CONTAINER_STEP_GROUP_AWS_S3_DOWNLOAD: true
        }}
      >
        <ManifestListView {...(props as ManifestListViewProps)} deploymentType={'ServerlessAwsLambda'} />
      </TestWrapper>
    )

    const addManifestBtn = getByText('pipeline.manifestType.addManifestLabel')

    // open manifest create form
    expect(addManifestBtn).toBeInTheDocument()
    await userEvent.click(addManifestBtn)
    await waitFor(() => {
      const modals = document.getElementsByClassName('bp3-dialog')
      const manifestModal = modals[0]! as HTMLElement
      expect(manifestModal).toBeInTheDocument()
    })

    // select valuesManifest Element
    const valuesManifestElement = getByText('pipeline.manifestTypeLabels.ValuesYaml')
    expect(valuesManifestElement).toBeInTheDocument()
    await userEvent.click(valuesManifestElement)
    expect(getByText('continue')).toBeInTheDocument()

    // click on continue button
    act(async () => {
      await userEvent.click(getByText('continue'))
    })

    // wait for opening select store form with correct fields
    await waitFor(() => {
      expect(getByText('pipeline.manifestTypeLabels.ValuesYaml')).toBeInTheDocument()
      expect(getByText('pipeline.manifestType.gitConnectorLabel')).toBeInTheDocument()
      expect(getByText('common.repo_provider.githubLabel')).toBeInTheDocument()
      expect(getByText('common.repo_provider.gitlabLabel')).toBeInTheDocument()
      expect(getByText('common.repo_provider.bitbucketLabel')).toBeInTheDocument()
      expect(getByText('pipeline.manifestType.azureRepoConnectorLabel')).toBeInTheDocument()
      expect(getByText('platform.connectors.S3')).toBeInTheDocument()
    })
  })

  test('should render existing manifest without any error: ServerlessAwsLambda > ServerlessAwsLambda', async () => {
    const componentProps = {
      ...manifestsPropsForServerlessLambdaWithExistingList,
      updateManifestList: jest.fn(),
      removeValuesYaml: jest.fn(),
      removeManifestConfig: jest.fn(),
      attachPathYaml: jest.fn()
    }
    const { container, getByText } = render(
      <TestWrapper>
        <ManifestListView {...(componentProps as ManifestListViewProps)} deploymentType={'ServerlessAwsLambda'} />
      </TestWrapper>
    )
    const editButtons = container.querySelectorAll('[data-icon="Edit"]')
    expect(editButtons).toHaveLength(2)
    const functionDefinitionManifestEditButton = editButtons[0]
    expect(functionDefinitionManifestEditButton).toBeInTheDocument()
    const modals = document.getElementsByClassName('bp3-dialog')
    expect(modals.length).toBe(0)
    await userEvent.click(functionDefinitionManifestEditButton)
    expect(modals.length).toBe(1)
    const manifestModal = modals[0]! as HTMLElement
    const identifierField = queryByNameAttribute('identifier', manifestModal)
    expect(identifierField).toBeInTheDocument()
    expect(identifierField).toHaveValue('ServerlessAwsLambdaManifest')

    const regionField = queryByNameAttribute('region', manifestModal)
    expect(regionField).toBeInTheDocument()
    expect(regionField).toHaveValue('us-east-1')

    const bucketNameField = queryByNameAttribute('bucketName', manifestModal)
    expect(bucketNameField).toBeInTheDocument()
    expect(bucketNameField).toHaveValue('my-first-serverless-proj-serverlessdeploymentbuck-pos1c8m0h4fh')

    const path1 = queryByNameAttribute('paths[0].path', manifestModal)
    expect(path1).toBeInTheDocument()
    expect(path1).toHaveValue('path.zip')

    expect(getByText('advancedTitle')).toBeInTheDocument()
    await userEvent.click(getByText('advancedTitle'))

    const configOverridePathField = queryByNameAttribute('configOverridePath', manifestModal)
    expect(configOverridePathField).toBeInTheDocument()
    expect(configOverridePathField).toHaveValue('test/path.yaml')
  })

  test('should render existing manifest without any error: ServerlessAwsLambda > Values', async () => {
    const componentProps = {
      ...manifestsPropsForServerlessLambdaWithExistingList,
      updateManifestList: jest.fn(),
      removeValuesYaml: jest.fn(),
      removeManifestConfig: jest.fn(),
      attachPathYaml: jest.fn()
    }
    const { container, queryByText } = render(
      <TestWrapper>
        <ManifestListView {...(componentProps as ManifestListViewProps)} deploymentType={'ServerlessAwsLambda'} />
      </TestWrapper>
    )
    const editButtons = container.querySelectorAll('[data-icon="Edit"]')
    expect(editButtons).toHaveLength(2)
    const functionDefinitionManifestEditButton = editButtons[1]
    expect(functionDefinitionManifestEditButton).toBeInTheDocument()
    const modals = document.getElementsByClassName('bp3-dialog')
    expect(modals.length).toBe(0)
    await userEvent.click(functionDefinitionManifestEditButton)
    expect(modals.length).toBe(1)
    const manifestModal = modals[0]! as HTMLElement
    const identifierField = queryByNameAttribute('identifier', manifestModal)
    expect(identifierField).toBeInTheDocument()
    expect(identifierField).toHaveValue('ValuesManifest')

    const regionField = queryByNameAttribute('region', manifestModal)
    expect(regionField).toBeInTheDocument()
    expect(regionField).toHaveValue('us-east-1')

    const bucketNameField = queryByNameAttribute('bucketName', manifestModal)
    expect(bucketNameField).toBeInTheDocument()
    expect(bucketNameField).toHaveValue('my-first-serverless-proj-serverlessdeploymentbuck-pos1c8m0h4fh')

    const path1 = queryByNameAttribute('paths[0].path', manifestModal)
    expect(path1).toBeInTheDocument()
    expect(path1).toHaveValue('path.zip')

    expect(queryByText('advancedTitle')).not.toBeInTheDocument()
  })
})
