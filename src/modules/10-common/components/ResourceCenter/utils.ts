/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import moment from 'moment'
import type { AccountDTO, UserInfo } from 'services/cd-ng'

export const ON_PREM_RELEASE_NOTE_LINK = 'https://ngdocs.harness.io/article/556wy85kbo-harness-on-prem-release-notes'

export const HARNESS_SEARCH_LINK = 'https://harness.io/search/'
export const HARNESS_UNIVERISITY_LINK = 'https://developer.harness.io/certifications/'
export const HARNESS_COMMUNITY_LINK = 'https://community.harness.io/'
export const HARNESS_COMMUNITY_SLACK_LINK =
  'https://join.slack.com/t/harnesscommunity/shared_invite/zt-y4hdqh7p-RVuEQyIl5Hcx4Ck8VCvzBw'
export const HARNESS_DOCS_LINK = 'https://docs.harness.io/'
export const HARNESS_API_DOCS_LINK = 'https://apidocs.harness.io/'
export const HARNESS_TUTORIALS = 'https://developer.harness.io/tutorials/get-started'
export const SITE_STATUS_LINK = 'https://status.harness.io/'
export const HARNESS_JFROG =
  'https://developer.harness.io/docs/continuous-integration/use-ci/build-and-upload-artifacts/upload-artifacts-to-jfrog'
export const HARNESS_SUPPORT_PAGE = 'https://www.harness.io/support-search'

export const timestamp = moment.now()
export const HARNESS_SUPPORT_LINK =
  '/sso.html?action=login&brand_id=114095000394&locale_id=1&return_to=https%3A%2F%2Fsupport.harness.io%2Fhc%2Fen-us%2Frequests&src=zendesk&timestamp=' +
  timestamp
export const CANNY_SUPPORT_LINK = 'https://ideas.harness.io/'
export const WHATS_NEW_LINK = `https://docs.harness.io/article/ueeiji09do-what-s-new`
export const EARLY_ACCESS_LINK = `https://docs.harness.io/article/w4krvu96i3-early-access`
export const NEW_NAV_FAQS = 'https://developer.harness.io/kb/platform/new-navigation-faqs'

export const openZendeskSupport = (e: React.MouseEvent<Element, MouseEvent>): void => {
  e.stopPropagation()
  e.preventDefault()
  window.open(HARNESS_SUPPORT_LINK)
}

const getInitials = (name: string) => {
  const parts = name.split('.')
  let initials = ''
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].length > 0 && parts[i] !== '') {
      initials += parts[i][0]
    }
  }
  return initials
}
const initCanny = (currentUserInfo: UserInfo, account?: AccountDTO) => {
  Canny('identify', {
    appID: window.cannyAppId,
    user: {
      companies: [
        {
          id: account?.identifier,
          name: account?.companyName
        }
      ],
      email: currentUserInfo.email,
      id: currentUserInfo.uuid,
      name: account?.cannyUsernameAbbreviationEnabled
        ? currentUserInfo.name?.includes('@')
          ? getInitials(currentUserInfo.name.split('@')[0] || '') || ''
          : getInitials(currentUserInfo.name || '') || ''
        : currentUserInfo.name || ''
    }
  })
}

export const cannySupportShareYourIdeas = (
  e: React.MouseEvent<Element, MouseEvent>,
  currentUserInfo: UserInfo,
  account?: AccountDTO
): void => {
  e.stopPropagation()
  e.preventDefault()
  initCanny(currentUserInfo, account)
  window.open(CANNY_SUPPORT_LINK)
}

export const openWhatsNew = (e: React.MouseEvent<Element, MouseEvent>): void => {
  e.stopPropagation()
  e.preventDefault()
  window.open(WHATS_NEW_LINK)
}

export const openEarlyAccess = (e: React.MouseEvent<Element, MouseEvent>): void => {
  e.stopPropagation()
  e.preventDefault()
  window.open(EARLY_ACCESS_LINK)
}

export const getReleaseNotesLink = () => {
  return window.releaseNotesLink || ON_PREM_RELEASE_NOTE_LINK
}
