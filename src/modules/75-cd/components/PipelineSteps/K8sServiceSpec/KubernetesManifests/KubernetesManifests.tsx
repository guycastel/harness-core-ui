/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useEffect } from 'react'
import { defaultTo, get, isEmpty } from 'lodash-es'
import cx from 'classnames'
import { Text } from '@harness/uicore'

import { useStrings } from 'framework/strings'
import manifestSourceBaseFactory from '@cd/factory/ManifestSourceFactory/ManifestSourceBaseFactory'
import type { GitQueryParams } from '@common/interfaces/RouteInterfaces'
import { useQueryParams } from '@common/hooks'

import type { ManifestConfig } from 'services/cd-ng'
import { isTemplatizedView } from '@pipeline/utils/stepUtils'
import { useGetChildPipelineMetadata } from '@pipeline/hooks/useGetChildPipelineMetadata'
import type { KubernetesManifestsProps } from '../K8sServiceSpecInterface'
import { fromPipelineInputTriggerTab, getManifestTriggerSetValues } from '../ManifestSource/ManifestSourceUtils'
import css from './KubernetesManifests.module.scss'

interface ManifestInputFieldProps extends KubernetesManifestsProps {
  manifest: ManifestConfig
}
const ManifestInputField = (props: ManifestInputFieldProps): React.ReactElement | null => {
  const { accountId, orgIdentifier, projectIdentifier, pipelineIdentifier } = useGetChildPipelineMetadata(
    props.childPipelineMetadata
  )
  const { repoIdentifier, branch } = useQueryParams<GitQueryParams>()

  const runtimeMode = isTemplatizedView(props.stepViewType)
  const isManifestsRuntime = runtimeMode && !!get(props.template, 'manifests', false)
  const manifestSource = manifestSourceBaseFactory.getManifestSource(props.manifest.type)
  const manifestDefaultValue = defaultTo(props.manifests, props.template.manifests)?.find(
    manifestData => manifestData?.manifest?.identifier === props.manifest?.identifier
  )?.manifest as ManifestConfig

  useEffect(() => {
    /* instanbul ignore else */
    if (fromPipelineInputTriggerTab(props.formik, props.fromTrigger)) {
      const manifestTriggerData = getManifestTriggerSetValues(
        props.initialValues,
        props.formik,
        props.stageIdentifier,
        props.manifestPath as string
      )
      !isEmpty(manifestTriggerData) &&
        props.formik.setFieldValue(`${props.path}.${props.manifestPath}`, manifestTriggerData)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!manifestSource) {
    return null
  }
  return (
    <div key={props.manifest?.identifier}>
      <Text className={css.inputheader} margin={{ top: 'medium' }}>
        {!props.fromTrigger && get(props.manifest, 'identifier', '')}
      </Text>
      {manifestSource &&
        manifestSource.renderContent({
          ...props,
          isManifestsRuntime,
          projectIdentifier,
          orgIdentifier,
          accountId,
          pipelineIdentifier,
          repoIdentifier,
          branch,
          manifest: manifestDefaultValue
        })}
    </div>
  )
}
export function KubernetesManifests(props: KubernetesManifestsProps): React.ReactElement {
  const { primaryManifest, formik, path, isHelm } = props
  const { getString } = useStrings()
  const primaryManifestId =
    defaultTo(get(formik?.values, `${path}.manifestConfigurations.primaryManifestRef`), '') || primaryManifest
  const filteredManifests_ = props.template.manifests?.filter(
    manifestObj => get(manifestObj, 'manifest.identifier') === primaryManifestId
  )

  const filteredManifests =
    isHelm && get(props, 'template.manifests.length') > 1 ? filteredManifests_ : props?.template?.manifests

  return (
    <div className={cx(css.nopadLeft, css.accordionSummary)} id={`Stage.${props.stageIdentifier}.Service.Manifests`}>
      {!!filteredManifests?.length && !props.fromTrigger && (
        <div className={css.subheading}>
          {getString('pipelineSteps.deploy.serviceSpecifications.deploymentTypes.manifests')}
        </div>
      )}
      {filteredManifests?.map(manifestObj => {
        if (!manifestObj?.manifest || !props.template.manifests?.length) {
          return null
        }
        const manifestIndex = props.template.manifests?.findIndex(
          templateManifestObj => templateManifestObj.manifest?.identifier === get(manifestObj, 'manifest.identifier')
        )
        const manifestPath = `manifests[${manifestIndex}].manifest`

        return (
          <ManifestInputField
            {...props}
            manifest={manifestObj.manifest}
            manifestPath={manifestPath}
            key={manifestObj.manifest?.identifier}
          />
        )
      })}
    </div>
  )
}
