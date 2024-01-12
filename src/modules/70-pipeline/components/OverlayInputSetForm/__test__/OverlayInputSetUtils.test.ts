import { StoreType } from '@common/constants/GitSyncTypes'
import { getGitProviderCards } from '@common/components/GitProviderSelect/GitProviderSelect'
import { InputSetDTO } from '@pipeline/utils/types'
import { getCreateUpdateRequestBodyOptions } from '../OverlayInputSetUtils'

const getString = (key: any): any => {
  return key
}

describe('OverlayInputSetUtils test', () => {
  test('get correct value for getCreateUpdateRequestBodyOptions', () => {
    expect(
      getCreateUpdateRequestBodyOptions({
        inputSetObj: {} as InputSetDTO,
        accountId: 'testAcc',
        orgIdentifier: 'testOrg',
        projectIdentifier: 'testProject',
        pipelineIdentifier: 'pipeline',
        gitDetails: {
          repoName: 'gitSyncRepo',
          branch: 'feature',
          isNewBranch: false,
          createPr: false,
          commitMsg: 'Create input set abc'
        },
        objectId: '123',
        initialGitDetails: {},
        isEdit: false,
        initialStoreMetadata: {
          connectorRef: 'ValidGithubRepo',
          storeType: StoreType.REMOTE,
          provider: getGitProviderCards(getString)[1]
        }
      })
    ).toEqual({
      queryParams: {
        accountIdentifier: 'testAcc',
        branch: 'feature',
        commitMsg: 'Create input set abc',
        connectorRef: 'ValidGithubRepo',
        createPr: false,
        isNewBranch: false,
        orgIdentifier: 'testOrg',
        pipelineIdentifier: 'pipeline',
        projectIdentifier: 'testProject',
        repoName: 'gitSyncRepo',
        storeType: 'REMOTE'
      }
    })
  })

  test('get correct value for getCreateUpdateRequestBodyOptions - edit fow', () => {
    expect(
      getCreateUpdateRequestBodyOptions({
        inputSetObj: { identifier: 'abc' } as InputSetDTO,
        accountId: 'testAcc',
        orgIdentifier: 'testOrg',
        projectIdentifier: 'testProject',
        pipelineIdentifier: 'pipeline',
        gitDetails: {
          repoName: 'gitSyncRepo',
          branch: 'feature',
          isNewBranch: false,
          createPr: false,
          commitMsg: 'Create input set abc'
        },
        objectId: '123',
        initialGitDetails: {},
        isEdit: true,
        initialStoreMetadata: {
          connectorRef: 'ValidGithubRepo',
          storeType: StoreType.REMOTE,
          provider: getGitProviderCards(getString)[1]
        },
        conflictCommitId: '1234'
      })
    ).toEqual({
      pathParams: { inputSetIdentifier: 'abc' },
      queryParams: {
        accountIdentifier: 'testAcc',
        branch: 'feature',
        commitMsg: 'Create input set abc',
        connectorRef: 'ValidGithubRepo',
        createPr: false,
        isNewBranch: false,
        lastCommitId: '1234',
        lastObjectId: '123',
        orgIdentifier: 'testOrg',
        pipelineIdentifier: 'pipeline',
        projectIdentifier: 'testProject',
        repoName: 'gitSyncRepo',
        storeType: 'REMOTE'
      }
    })
  })
})
