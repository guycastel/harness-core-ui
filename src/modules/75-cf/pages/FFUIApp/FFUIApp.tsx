/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { FC, lazy } from 'react'
import ChildAppMounter from 'microfrontends/ChildAppMounter'
import type { FFCustomMicroFrontendProps } from '@cf/FFCustomMicroFrontendProps.types'
import * as ffServices from 'services/cf'
import {
  useGetEnvironment as useCDGetEnvironment,
  useGetEnvironmentListForProject as useCDGetEnvironmentListForProject,
  useDeleteEnvironmentV2 as useCDDeleteEnvironment,
  useCreateEnvironment as useCDCreateEnvironment,
  useGetOrganizationAggregateDTOList as useCDGetOrganizationAggregateDTOList,
  useGetOrganizationList as useCDGetOrganizationList,
  useGetProjectAggregateDTOList as useCDGetProjectAggregateDTOList
} from 'services/cd-ng'
import { useGetAllPerspectives as useCCMGetAllPerspectives } from 'services/ce'
import { useLicenseStore } from 'framework/LicenseStore/LicenseStoreContext'
import { useConfirmAction, useLocalStorage, useQueryParams } from '@common/hooks'
import { useQueryParamsState } from '@common/hooks/useQueryParamsState'
import { PreferenceScope, usePreferenceStore } from 'framework/PreferenceStore/PreferenceStoreContext'
import useActiveEnvironment from '@cf/hooks/useActiveEnvironment'
import { useSyncedEnvironment } from '@cf/hooks/useSyncedEnvironment'
import { FeatureWarningTooltip } from '@common/components/FeatureWarning/FeatureWarningWithTooltip'
import { PolicyManagementEvaluationModal } from '@governance/PolicyManagementEvaluationModal'
import RbacOptionsMenuButton from '@rbac/components/RbacOptionsMenuButton/RbacOptionsMenuButton'
import { ContainerSpinner } from '@common/components/ContainerSpinner/ContainerSpinner'
import { Description } from '@common/components/NameIdDescriptionTags/NameIdDescriptionTags'
import routes from '@common/RouteDefinitions'
import { IdentifierSchema, NameSchema } from '@common/utils/Validation'
import { FeatureIdentifier } from 'framework/featureStore/FeatureIdentifier'
import { getIdentifierFromName } from '@common/utils/StringUtils'
import { GitSyncForm } from '@gitsync/components/GitSyncForm/GitSyncForm'
import * as trackingConstants from '@common/constants/TrackingConstants'
import { StepStatus } from '@common/constants/StepStatusTypes'
import { MarkdownViewer } from '@common/components/MarkdownViewer/MarkdownViewer'
import { ResourceCenter } from '@common/components/ResourceCenter/ResourceCenter'

// eslint-disable-next-line import/no-unresolved
const FFUIMFEApp = lazy(() => import('ffui/MicroFrontendApp'))

const FFUIApp: FC = () => (
  <ChildAppMounter<FFCustomMicroFrontendProps>
    ChildApp={FFUIMFEApp}
    ffServices={{
      ...ffServices,
      useCDCreateEnvironment,
      useCDDeleteEnvironment,
      useCDGetEnvironment,
      useCDGetEnvironmentListForProject,
      useCDGetOrganizationAggregateDTOList,
      useCDGetOrganizationList,
      useCDGetProjectAggregateDTOList,
      useCCMGetAllPerspectives
    }}
    customHooks={{
      useActiveEnvironment,
      useConfirmAction,
      useLicenseStore,
      useLocalStorage,
      useQueryParams,
      useQueryParamsState,
      useSyncedEnvironment,
      usePreferenceStore
    }}
    customComponents={{
      ContainerSpinner,
      Description,
      EvaluationModal: PolicyManagementEvaluationModal,
      FeatureWarningTooltip,
      GitSyncForm,
      MarkdownViewer,
      RbacOptionsMenuButton,
      ResourceCenter
    }}
    customRoutes={routes}
    customUtils={{ getIdentifierFromName, IdentifierSchema, NameSchema }}
    customEnums={{ FeatureIdentifier, PreferenceScope, StepStatus, trackingConstants }}
  />
)

export default FFUIApp
