/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { noop } from 'lodash-es'
import { render, fireEvent, queryByAttribute, waitFor, screen } from '@testing-library/react'
import { act } from 'react-dom/test-utils'
import { TestWrapper } from '@common/utils/testUtils'
import { clickSubmit } from '@common/utils/JestFormHelper'

import CreateCustomSMConnector from '../CreateCustomSMConnector'
import { mockResponse } from '../../__test__/commonMock'

const commonProps = {
  accountId: 'dummy',
  orgIdentifier: '',
  projectIdentifier: '',
  setIsEditMode: noop,
  onClose: noop,
  onSuccess: noop
}
const updateConnector = jest.fn()
const createConnector = jest.fn()
jest.mock('services/portal', () => ({
  useGetDelegateTags: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  useGetDelegatesStatus: jest.fn().mockImplementation(() => {
    return { data: {}, refetch: jest.fn(), error: null, loading: false }
  }),
  useGetDelegateFromId: jest.fn().mockImplementation(() => jest.fn()),
  useGetDelegateSelectorsUpTheHierarchy: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  useGetDelegatesUpTheHierarchy: jest.fn().mockImplementation(() => ({ mutate: jest.fn() }))
}))

jest.mock('services/cd-ng', () => ({
  validateTheIdentifierIsUniquePromise: jest.fn().mockImplementation(() => Promise.resolve(mockResponse)),
  useCreateConnector: jest.fn().mockImplementation(() => ({ mutate: createConnector })),
  useUpdateConnector: jest.fn().mockImplementation(() => ({ mutate: updateConnector })),
  //   getSecretV2Promise: jest.fn().mockImplementation(() => Promise.resolve(mockSecret)),
  useGetTestConnectionResult: jest.fn().mockImplementation(() => jest.fn()),
  useGetFileContent: jest.fn().mockImplementation(() => ({ refetch: jest.fn() })),
  useGetFileByBranch: jest.fn().mockImplementation(() => ({ refetch: jest.fn() })),
  useCreatePR: jest.fn().mockImplementation(() => ({ mutate: jest.fn() })),
  useCreatePRV2: jest.fn().mockImplementation(() => ({ mutate: jest.fn() }))
}))

jest.mock('services/template-ng', () => ({
  getTemplateInputSetYamlPromise: jest.fn().mockImplementation(() =>
    Promise.resolve({
      status: 'SUCCESS',
      data: 'environmentVariables:\n- name: "key"\n  type: "String"\n  value: "<+input>"\n- name: "engine"\n  type: "String"\n  value: "<+input>"\n',
      metaData: null,
      correlationId: '9a4ce344-ac48-42e3-9466-ffdca5677d61'
    })
  )
}))

const getTemplateMock = () =>
  Promise.resolve({
    template: {
      accountId: 'kmpySmUISimoRrJL6NL73w',
      orgIdentifier: 'default',
      projectIdentifier: 'Templates_Variable',
      identifier: 'New_SecretManager_Template_Name_1',
      name: 'Template Name 1',
      description: '',
      tags: {},
      yaml: 'template:\n  name: Template Name 1\n  identifier: New_SecretManager_Template_Name_1\n  versionLabel: "2"\n  type: SecretManager\n  projectIdentifier: Templates_Variable\n  orgIdentifier: default\n  tags: {}\n  spec:\n    executionTarget: {}\n    shell: Bash\n    source:\n      spec:\n        script: |-\n          curl -o secret.json -X GET https://vaultqa.harness.io/v1/<+spec.environmentVariables.engine>/shreyas/<+spec.environmentVariables.secretName> -H \'X-Vault-Token: <+secrets.getValue("vaulttoken")>\'\n          secret=$(jq -r \'.data."<+spec.environmentVariables.key>"\' secret.json)\n        type: Inline\n    onDelegate: true\n    environmentVariables:\n      - name: key\n        type: String\n        value: <+input>\n      - name: engine\n        type: String\n        value: <+input>\n    outputVariables: []\n',
      versionLabel: '2',
      templateEntityType: 'SecretManager',
      templateScope: 'project',
      version: 4,
      gitDetails: {
        objectId: null,
        branch: null,
        repoIdentifier: null,
        rootFolder: null,
        filePath: null,
        repoName: null,
        commitId: null,
        fileUrl: null
      },
      entityValidityDetails: { valid: true, invalidYaml: null },
      lastUpdatedAt: 1660213211337,
      createdAt: 1660211466634,
      stableTemplate: true
    }
  })

describe('CreateCustomSMConnector wizard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  test('CreateCustomSMConnector step one', async () => {
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/connectors" pathParams={{ accountId: 'dummy' }}>
        <CreateCustomSMConnector
          getTemplate={jest.fn()}
          {...commonProps}
          isEditMode={false}
          connectorInfo={undefined}
        />
      </TestWrapper>
    )
    // fill step 1
    await act(async () => {
      clickSubmit(container)
    })

    await waitFor(() => expect(getByText('common.validation.nameIsRequired')).toBeInTheDocument())
  })

  test('CreateCustomSMConnector step two', async () => {
    const { container, getByText } = render(
      <TestWrapper path="/account/:accountId/resources/connectors" pathParams={{ accountId: 'dummy' }}>
        <CreateCustomSMConnector
          {...commonProps}
          isEditMode={false}
          connectorInfo={undefined}
          getTemplate={getTemplateMock as any}
        />
      </TestWrapper>
    )

    // fill step 1
    const nameInput = queryByAttribute('name', container, 'name')
    expect(nameInput).toBeTruthy()
    if (nameInput) fireEvent.change(nameInput, { target: { value: 'dummy name' } })
    act(() => {
      clickSubmit(container)
    })
    await waitFor(() => getByText('Shell Script'))
    // step 2 validation check
    act(() => {
      clickSubmit(container)
    })

    await waitFor(() => getByText('platform.connectors.customSM.validation.template'))
    const selectTemplateBtn = getByText('platform.connectors.customSM.selectTemplate')
    act(() => {
      fireEvent.click(selectTemplateBtn)
    })

    // Assert Execute On Delegate
    const executeOnDelegate = screen.getByText('Execute on Delegate')
    expect(executeOnDelegate).toBeVisible()

    // Assert Timeout Input element
    const inputBox = container.querySelector('[name="timeout"]') as HTMLInputElement

    expect(inputBox.getAttribute('value')).toBe('20')
    expect(inputBox.getAttribute('min')).toBe('1')
    expect(inputBox.getAttribute('max')).toBe('3600')
    expect(inputBox.getAttribute('type')).toBe('number')

    // step 2
    await waitFor(() => getByText('common.inputVariables'))
    act(() => {
      clickSubmit(container)
    })

    // Assert Fixed value variables to be empty and validation error message to be visible.
    const validationRequired = screen.getAllByText('common.validation.valueIsRequired')
    expect(validationRequired).toHaveLength(2)

    expect(container.querySelector('input[value="engine"]')).toBeDefined()
    expect(container.querySelector('input[value="key"]')).toBeDefined()
    const backButton = getByText('back')
    act(() => {
      fireEvent.click(backButton)
    })
    await waitFor(() => getByText('name'))
  })
})
