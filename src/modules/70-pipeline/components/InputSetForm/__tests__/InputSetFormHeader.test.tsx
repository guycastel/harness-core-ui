import React from 'react'
import { VisualYamlSelectedView } from '@harness/uicore'
import { fireEvent, render, screen } from '@testing-library/react'
import { TestWrapper } from '@modules/10-common/utils/testUtils'
import routes from '@common/RouteDefinitions'
import { accountPathProps, inputSetFormPathProps, pipelineModuleParams } from '@modules/10-common/utils/routeUtils'
import { defaultAppStoreValues } from '@modules/10-common/utils/DefaultAppStoreData'
import { gitConfigs, sourceCodeManagers } from '@modules/27-platform/connectors/mocks/mock'
import { InputSetFormHeader, InputSetFormHeaderProps } from '../../InputSetFormHeader/InputSetFormHeader'

const TEST_INPUT_SET_FORM_PATH = routes.toInputSetForm({
  ...accountPathProps,
  ...inputSetFormPathProps,
  ...pipelineModuleParams
})

const branches = { data: ['master', 'devBranch', 'feature'], status: 'SUCCESS' }
const fetchBranches = jest.fn(() => Promise.resolve(branches))
const getListGitSync = jest.fn(() => Promise.resolve(gitConfigs))

jest.mock('services/cd-ng', () => ({
  useCreatePR: jest.fn(() => jest.fn()),
  useCreatePRV2: jest.fn(() => jest.fn()),
  useGetFileContent: jest.fn(() => jest.fn()),
  useGetFileByBranch: jest.fn().mockImplementation(() => ({ refetch: jest.fn() })),
  useListGitSync: jest.fn().mockImplementation(() => {
    return { data: gitConfigs, refetch: getListGitSync }
  }),
  useGetListOfBranchesByRefConnectorV2: jest.fn().mockImplementation(() => {
    return { data: branches, refetch: fetchBranches, error: null, loading: false }
  })
}))

jest.mock('services/cd-ng-rq', () => ({
  useGetSourceCodeManagersQuery: jest.fn().mockImplementation(() => {
    return { data: sourceCodeManagers, refetch: jest.fn() }
  })
}))

const getInputSetFormHeaderProps = (): InputSetFormHeaderProps => ({
  disableVisualView: false,
  inputSet: { name: 'inputSetName', storeType: 'INLINE', identifier: 'inputSetIdentifier' },
  isEdit: true,
  isEditable: true,
  isFormDirty: false,
  loading: false,
  openDiffModal: () => undefined,
  pipelineName: 'pipelineName',
  selectedView: VisualYamlSelectedView.VISUAL,
  isGitSyncEnabled: true,
  pipelineGitDetails: {},
  handleModeSwitch: () => undefined,
  handleReloadFromCache: () => undefined,
  handleSaveInputSetForm: () => undefined,
  inputSetUpdateResponseHandler: () => undefined,
  onBranchChange: () => undefined,
  onCancel: () => undefined
})

describe('test InputSetFormHeader', () => {
  test('should properly render - edit inputset', async () => {
    const inputSetFormHeaderProps = getInputSetFormHeaderProps()

    render(
      <TestWrapper
        path={TEST_INPUT_SET_FORM_PATH}
        pathParams={{
          accountId: 'testAcc',
          orgIdentifier: 'testOrg',
          projectIdentifier: 'test',
          pipelineIdentifier: 'pipeline',
          inputSetIdentifier: '-1',
          module: 'cd'
        }}
        defaultAppStoreValues={defaultAppStoreValues}
      >
        <InputSetFormHeader {...inputSetFormHeaderProps} />
      </TestWrapper>
    )

    expect(screen.getByText('test')).toBeInTheDocument()
    expect(screen.getByText('pipelines')).toBeInTheDocument()
    expect(screen.getByText('pipelineName')).toBeInTheDocument()
    expect(screen.getByText('VISUAL')).toBeInTheDocument()
    expect(screen.getByText('YAML')).toBeInTheDocument()
    expect(screen.getByText('inputSets.editTitle')).toBeInTheDocument()
    expect(screen.getByText('save')).toBeInTheDocument()
    expect(screen.getByText('cancel')).toBeInTheDocument()
    expect(screen.getByLabelText('input set menu actions')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('input set menu actions'))
    const reconcileBtn = await screen.findByText('pipeline.outOfSyncErrorStrip.reconcile')
    expect(reconcileBtn).toBeInTheDocument()
  })

  test('should properly render - new inputset', async () => {
    const inputSetFormHeaderProps = {
      ...getInputSetFormHeaderProps(),
      isEdit: false
    }

    render(
      <TestWrapper
        path={TEST_INPUT_SET_FORM_PATH}
        pathParams={{
          accountId: 'testAcc',
          orgIdentifier: 'testOrg',
          projectIdentifier: 'test',
          pipelineIdentifier: 'pipeline',
          inputSetIdentifier: '-1',
          module: 'cd'
        }}
        defaultAppStoreValues={defaultAppStoreValues}
      >
        <InputSetFormHeader {...inputSetFormHeaderProps} />
      </TestWrapper>
    )

    expect(screen.getByText('test')).toBeInTheDocument()
    expect(screen.getByText('pipelines')).toBeInTheDocument()
    expect(screen.getByText('pipelineName')).toBeInTheDocument()
    expect(screen.getByText('VISUAL')).toBeInTheDocument()
    expect(screen.getByText('YAML')).toBeInTheDocument()
    expect(screen.getByText('inputSets.newInputSetLabel')).toBeInTheDocument()
    expect(screen.getByText('save')).toBeInTheDocument()
    expect(screen.getByText('cancel')).toBeInTheDocument()
    expect(screen.getByLabelText('input set menu actions')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('input set menu actions'))
    const reconcileBtn = await screen.findByText('pipeline.outOfSyncErrorStrip.reconcile')
    expect(reconcileBtn).toBeInTheDocument()
  })

  test('should render branch name', async () => {
    const inputSetFormHeaderProps = {
      ...getInputSetFormHeaderProps(),
      inputSet: {
        name: 'inputSetName',
        storeType: 'REMOTE' as InputSetFormHeaderProps['inputSet']['storeType'],
        identifier: 'inputSetIdentifier',
        gitDetails: {
          branch: 'mainBranch',
          filePath: 'filePath.yaml',
          repoName: 'mainRepo'
        }
      }
    }

    const { container } = render(
      <TestWrapper
        path={TEST_INPUT_SET_FORM_PATH}
        pathParams={{
          accountId: 'testAcc',
          orgIdentifier: 'testOrg',
          projectIdentifier: 'test',
          pipelineIdentifier: 'pipeline',
          inputSetIdentifier: '-1',
          module: 'cd'
        }}
        defaultAppStoreValues={defaultAppStoreValues}
      >
        <InputSetFormHeader {...inputSetFormHeaderProps} />
      </TestWrapper>
    )

    const inputEl = container.querySelector(`input[name="remoteBranch"]`)

    expect(inputEl).toHaveValue('mainBranch')
  })

  test('should call handleReloadFromCache', async () => {
    const handleReloadFromCacheMock = jest.fn()
    const inputSetFormHeaderProps = {
      ...getInputSetFormHeaderProps(),
      inputSet: {
        name: 'inputSetName',
        storeType: 'REMOTE' as InputSetFormHeaderProps['inputSet']['storeType'],
        identifier: 'inputSetIdentifier'
      },
      handleReloadFromCache: handleReloadFromCacheMock
    }

    render(
      <TestWrapper
        path={TEST_INPUT_SET_FORM_PATH}
        pathParams={{
          accountId: 'testAcc',
          orgIdentifier: 'testOrg',
          projectIdentifier: 'test',
          pipelineIdentifier: 'pipeline',
          inputSetIdentifier: '-1',
          module: 'cd'
        }}
        defaultAppStoreValues={defaultAppStoreValues}
      >
        <InputSetFormHeader {...inputSetFormHeaderProps} />
      </TestWrapper>
    )

    fireEvent.click(screen.getByLabelText('input set menu actions'))

    const reloadFromGitBtn = await screen.findByText('common.reloadFromGit')
    expect(reloadFromGitBtn).toBeInTheDocument()

    fireEvent.click(reloadFromGitBtn)

    expect(await screen.findByText('pipeline.pipelineCachedCopy.reloadPipeline')).toBeInTheDocument()
    expect(await screen.findByText('pipeline.pipelineCachedCopy.reloadPipelineContent')).toBeInTheDocument()

    const confirmBtn = screen.getByText('confirm')
    fireEvent.click(confirmBtn)

    expect(handleReloadFromCacheMock).toBeCalledTimes(1)
  })
})
