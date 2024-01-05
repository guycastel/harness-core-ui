/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, screen, act, fireEvent, queryByText } from '@testing-library/react'
import { TestWrapper, findPopoverContainer } from '@common/utils/testUtils'
import { ModeSelector } from '@common/components/ModeSelector/ModeSelector'
import { usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'

const navModuleInfoMapMock = {
  CD: {
    icon: 'cd-main',
    label: 'common.cdAndGitops',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/cd?noscope=true',
    shouldVisible: true,
    hasLicense: true,
    color: '--cd-border',
    backgroundColor: '',
    shortLabel: 'deploymentsText',
    moduleIntro: 'common.moduleIntro.deployments',
    isNew: true
  },
  CI: {
    icon: 'ci-main',
    label: 'common.purpose.ci.continuous',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/ci?noscope=true',
    shouldVisible: true,
    hasLicense: true,
    color: '--ci-border',
    backgroundColor: '',
    shortLabel: 'buildsText',
    moduleIntro: 'common.moduleIntro.builds'
  },
  CV: {
    icon: 'cv-main',
    label: 'common.serviceReliabilityManagement',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/cv?noscope=true',
    shouldVisible: true,
    hasLicense: true,
    color: '--srm-border',
    backgroundColor: '',
    shortLabel: 'common.purpose.cv.serviceReliability',
    moduleIntro: 'common.moduleIntro.reliabilityManagement'
  },
  CF: {
    icon: 'ff-solid',
    label: 'common.purpose.cf.continuous',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/cf?noscope=true',
    shouldVisible: true,
    hasLicense: true,
    color: '--ff-border',
    backgroundColor: '',
    shortLabel: 'featureFlagsText',
    moduleIntro: 'common.moduleIntro.featureFlag'
  },
  CE: {
    icon: 'ce-main',
    label: 'common.purpose.ce.continuous',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/ce?noscope=true',
    shouldVisible: true,
    hasLicense: true,
    color: '--ccm-border',
    backgroundColor: '',
    shortLabel: 'cloudCostsText',
    moduleIntro: 'common.moduleIntro.cloudCosts'
  },
  STO: {
    icon: 'sto-color-filled',
    label: 'common.stoText',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/sto?noscope=true',
    shouldVisible: true,
    hasLicense: true,
    color: '--sto-border',
    backgroundColor: '',
    shortLabel: 'common.purpose.sto.continuous',
    moduleIntro: 'common.moduleIntro.securityTest'
  },
  CHAOS: {
    icon: 'chaos-main',
    label: 'common.purpose.chaos.continuous',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/chaos?noscope=true',
    shouldVisible: true,
    hasLicense: true,
    color: '--chaos-border',
    backgroundColor: '',
    shortLabel: 'common.purpose.chaos.continuous',
    moduleIntro: 'common.moduleIntro.chaosEngineering'
  },
  CODE: {
    icon: 'code',
    label: 'common.purpose.code.title',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/code?noscope=true',
    shouldVisible: true,
    hasLicense: false,
    color: '--code-border',
    backgroundColor: '',
    shortLabel: 'common.purpose.code.name'
  },
  IACM: {
    icon: 'iacm',
    label: 'common.iacmText',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/iacm?noscope=true',
    shouldVisible: false,
    hasLicense: false,
    color: '--iacm-border',
    backgroundColor: '',
    shortLabel: 'common.infrastructures'
  },
  SSCA: {
    icon: 'ssca-main',
    label: 'common.sscaText',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/ssca?noscope=true',
    shouldVisible: true,
    hasLicense: false,
    color: '--default-module-border',
    backgroundColor: '',
    shortLabel: 'common.sscaShortLabel',
    moduleIntro: 'common.moduleIntro.softwareSupplyChainAssurance'
  },
  IDP: {
    icon: 'idp',
    label: 'common.purpose.idp.fullName',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/idp/default',
    shouldVisible: true,
    hasLicense: false,
    color: '--idp-border',
    backgroundColor: '',
    shortLabel: 'common.purpose.idp.name',
    moduleIntro: 'common.moduleIntro.idp'
  },
  CET: {
    icon: 'cet',
    label: 'common.purpose.cet.continuous',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/cet?noscope=true',
    shouldVisible: true,
    hasLicense: false,
    color: '--cet-border',
    backgroundColor: '',
    shortLabel: 'common.purpose.errorTracking.title',
    moduleIntro: 'common.moduleIntro.continuousErrorTracking'
  },
  SEI: {
    icon: 'sei-main',
    label: 'common.purpose.sei.fullName',
    homePageUrl: '/account/px7xd_BFRCi-pfWPYXVjvw/module/sei?noscope=true',
    shouldVisible: false,
    hasLicense: false,
    color: '--default-module-border',
    backgroundColor: '',
    shortLabel: 'common.purpose.sei.continuous',
    moduleIntro: 'common.moduleIntro.insights'
  }
}

jest.mock('framework/PreferenceStore/PreferenceStoreContext')
;(usePreferenceStore as jest.Mock).mockImplementation(() => {
  return {
    setPreference: jest.fn(),
    preference: {
      orderedModules: ['CD', 'CI', 'CV', 'CF', 'CE', 'STO', 'CHAOS', 'CODE', 'SSCA', 'IDP', 'CET'],
      selectedModules: ['CD', 'CI', 'CV', 'CF', 'CE', 'STO', 'CHAOS', 'CODE', 'SSCA', 'IDP', 'CET']
    },
    clearPreference: jest.fn()
  }
})
jest.mock('@common/hooks/useNavModuleInfo', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      return {}
    }),
    useNavModuleInfoMap: () => {
      return navModuleInfoMapMock
    },
    DEFAULT_MODULES_ORDER: ['CD', 'CI', 'CV', 'CF', 'CE', 'STO', 'CHAOS', 'CODE', 'SSCA', 'IDP', 'CET']
  }
})

describe('Mode selector', () => {
  const checkModuleCard = (container: HTMLElement, moduleLabel: string, href: string): void => {
    const moduleCard = queryByText(container, moduleLabel) as HTMLElement
    expect(moduleCard).toBeInTheDocument()
    expect(moduleCard.closest('a')).toHaveAttribute('href', href)
  }

  test('should render mode selector', async () => {
    const { container } = render(
      <TestWrapper defaultAppStoreValues={{ isNewNavEnabled: true }}>
        <ModeSelector />
      </TestWrapper>
    )
    const modeSelectorButton = container.querySelector('[data-icon="nine-dot-options"]') as HTMLInputElement
    await act(async () => {
      fireEvent.click(modeSelectorButton)
    })
    const popover = findPopoverContainer() as HTMLElement
    expect(popover).toBeInTheDocument()

    checkModuleCard(popover, 'common.nav.productivityViewTitle', '/all?noscope=true')
    checkModuleCard(popover, 'common.nav.accountAdmin', '/admin')
    checkModuleCard(popover, 'common.dashboards', '/dashboards')
    checkModuleCard(popover, 'common.cdAndGitops', '/account/px7xd_BFRCi-pfWPYXVjvw/module/cd?noscope=true')
    checkModuleCard(popover, 'common.purpose.ci.continuous', '/account/px7xd_BFRCi-pfWPYXVjvw/module/ci?noscope=true')
    checkModuleCard(
      popover,
      'common.serviceReliabilityManagement',
      '/account/px7xd_BFRCi-pfWPYXVjvw/module/cv?noscope=true'
    )
    checkModuleCard(popover, 'common.purpose.cf.continuous', '/account/px7xd_BFRCi-pfWPYXVjvw/module/cf?noscope=true')
    checkModuleCard(popover, 'common.purpose.ce.continuous', '/account/px7xd_BFRCi-pfWPYXVjvw/module/ce?noscope=true')
    checkModuleCard(popover, 'common.stoText', '/account/px7xd_BFRCi-pfWPYXVjvw/module/sto?noscope=true')
    checkModuleCard(
      popover,
      'common.purpose.chaos.continuous',
      '/account/px7xd_BFRCi-pfWPYXVjvw/module/chaos?noscope=true'
    )
    checkModuleCard(popover, 'common.purpose.code.title', '/account/px7xd_BFRCi-pfWPYXVjvw/module/code?noscope=true')
    checkModuleCard(popover, 'common.sscaText', '/account/px7xd_BFRCi-pfWPYXVjvw/module/ssca?noscope=true')
    checkModuleCard(popover, 'common.purpose.idp.fullName', '/account/px7xd_BFRCi-pfWPYXVjvw/module/idp/default')
    checkModuleCard(popover, 'common.purpose.cet.continuous', '/account/px7xd_BFRCi-pfWPYXVjvw/module/cet?noscope=true')

    fireEvent.click(queryByText(popover, 'common.nav.productivityViewTitle') as HTMLElement)
    expect(popover).not.toBeInTheDocument()
  })

  test('should open module configuration screen when configure button is clicked', async () => {
    const { container } = render(
      <TestWrapper defaultAppStoreValues={{ isNewNavEnabled: true }}>
        <ModeSelector />
      </TestWrapper>
    )

    const modeSelectorButton = container.querySelector('[data-icon="nine-dot-options"]') as HTMLInputElement
    await act(async () => {
      fireEvent.click(modeSelectorButton)
    })
    const popover = findPopoverContainer() as HTMLElement
    expect(popover).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(queryByText(popover, 'common.nav.configure') as HTMLElement)
    })
    expect(screen.getByText('common.moduleConfig.selectModulesNav')).toBeInTheDocument()
    act(() => {
      fireEvent.click(screen.getByText('cross'))
    })
    expect(screen.queryByText('common.moduleConfig.selectModulesNav')).not.toBeInTheDocument()
    const cdCard = popover.querySelector('[class="modeCard cd"]')
    expect(queryByText(cdCard as HTMLElement, 'COMMON.NEW')).toBeDefined()
  })
})
