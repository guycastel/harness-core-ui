/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { defaultTo } from 'lodash-es'

import { TemplateSummaryResponse, useListTemplateUsage } from 'services/template-ng'

import type { ProjectPathProps } from '@common/interfaces/RouteInterfaces'
import EntityUsageListingPage from '@common/pages/entityUsage/EntityUsageListingPage'

import css from '@templates-library/components/TemplateDetails/TemplateDetails.module.scss'

interface Props {
  selectedTemplate: TemplateSummaryResponse
  templates: TemplateSummaryResponse[]
}

export function TemplateReferenceByTabPanel(props: Props): React.ReactElement {
  const { selectedTemplate, templates } = props

  const { accountId } = useParams<ProjectPathProps>()
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [page, setPage] = useState(0)

  const stableTemplateInList = templates.find(
    /* istanbul ignore next */ template => template.stableTemplate && template.versionLabel
  ) as TemplateSummaryResponse

  const { data, loading, refetch, error } = useListTemplateUsage({
    queryParams: {
      accountIdentifier: accountId,
      projectIdentifier: selectedTemplate.projectIdentifier,
      orgIdentifier: selectedTemplate.orgIdentifier,
      isStableTemplate: defaultTo(selectedTemplate.stableTemplate, stableTemplateInList.stableTemplate),
      versionLabel: defaultTo(selectedTemplate.versionLabel, stableTemplateInList.versionLabel),
      searchTerm,
      pageSize: 4,
      pageIndex: page
    },
    templateIdentifier: selectedTemplate.identifier as string
  })

  return (
    <EntityUsageListingPage
      withSearchBarInPageHeader
      hidePageNumbers
      pageHeaderClassName={css.referencedByHeader}
      pageBodyClassName={css.referencedByBody}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      setPage={setPage}
      apiReturnProps={{
        data,
        loading,
        refetch,
        error
      }}
    />
  )
}
