/*
 * Copyright 2022 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { defaultTo } from 'lodash-es'

import { Popover, Position } from '@blueprintjs/core'
import { Icon, Text } from '@harness/uicore'

import cx from 'classnames'

import { String } from 'framework/strings'
import type { ServiceExecutionSummary } from 'services/cd-ng'

import type { ProjectPathProps, ModulePathParams } from '@common/interfaces/RouteInterfaces'

import { getScopedServiceUrl } from '@modules/70-pipeline/utils/scopedUrlUtils'
import { useFeatureFlags } from '@modules/10-common/hooks/useFeatureFlag'
import { ServicePopoverCard } from '../ServicePopoverCard/ServicePopoverCard'
import { ServicesTable } from './ServicesTable'
import css from './CDExecutionSummary.module.scss'

interface ServicesListProps {
  services: ServiceExecutionSummary[]
  className?: string
  limit: number
}

export function ServicesList({ services, limit = 2, className }: ServicesListProps): React.ReactElement {
  const { orgIdentifier, projectIdentifier, accountId, module } = useParams<ProjectPathProps & ModulePathParams>()
  const { CDS_NAV_2_0 = false } = useFeatureFlags()
  return (
    <div className={cx(css.main, className)}>
      <Icon name="services" className={css.servicesIcon} size={18} />
      <div className={css.servicesList}>
        {services.slice(0, limit).map(service => {
          const { identifier } = service

          return (
            <Popover
              key={identifier}
              wrapperTagName="div"
              targetTagName="div"
              interactionKind="hover"
              position={Position.BOTTOM_RIGHT}
              className={css.serviceWrapper}
            >
              <Text className={css.serviceName} lineClamp={1} color="grey800">
                <Link
                  to={getScopedServiceUrl(
                    {
                      accountId,
                      orgIdentifier,
                      projectIdentifier,
                      scopedServiceIdentifier: defaultTo(identifier, ''),
                      module,
                      accountRoutePlacement: 'settings',
                      serviceMetadata: {}
                    },
                    CDS_NAV_2_0
                  )}
                >
                  {service.displayName}
                </Link>
              </Text>
              <ServicePopoverCard service={service} />
            </Popover>
          )
        })}
        {services.length > limit ? (
          <Popover
            wrapperTagName="div"
            targetTagName="div"
            interactionKind="hover"
            position={Position.BOTTOM_RIGHT}
            className={css.serviceWrapper}
          >
            <String
              tagName="div"
              className={cx(css.serviceName, css.count)}
              stringID={'common.plusNumberNoSpace'}
              vars={{ number: Math.abs(services.length - limit) }}
            />
            <ServicesTable services={services.slice(limit)} />
          </Popover>
        ) : null}
      </div>
    </div>
  )
}
