import React, { useState, useEffect } from 'react'
import { Container, Button } from '@wings-software/uikit'
import { parse } from 'yaml'
import { useHistory, useParams, useLocation } from 'react-router-dom'

import YAMLBuilder from '@common/components/YAMLBuilder/YamlBuilder'
import { addIconInfoToSnippets, pickIconForEntity } from '@common/components/YAMLBuilder/YAMLBuilderUtils'
import { YamlEntity } from '@common/constants/YamlConstants'
import { PageBody } from '@common/components/Page/PageBody'
import { PageHeader } from '@common/components/Page/PageHeader'
import type { YamlBuilderHandlerBinding } from '@common/interfaces/YAMLBuilderProps'
import { useCreateConnector } from 'services/cd-ng'
import { useToaster } from '@common/exports'
import { YAMLService } from 'modules/dx/services'
import type { SnippetInterface } from '@common/interfaces/SnippetInterface'
import { Connectors } from 'modules/dx/constants'
import i18n from './CreateConnectorFromYaml.i18n'

const CreateConnectorFromYamlPage: React.FC = () => {
  const { accountId } = useParams()
  const [yamlHandler, setYamlHandler] = useState<YamlBuilderHandlerBinding | undefined>()
  const history = useHistory()
  const [snippets, setSnippets] = useState<SnippetInterface[]>()
  const { showSuccess, showError } = useToaster()
  const { mutate: createConnector } = useCreateConnector({ queryParams: { accountIdentifier: accountId } })

  const { pathname } = useLocation()

  //TODO @vardan convert to Promise.all when apis are available
  const fetchSnippets = (query?: string): void => {
    const { error: errorWhileFethingK8sSnippets, response: k8sConnSnippets } =
      YAMLService.fetchSnippets(YamlEntity.CONNECTOR, Connectors.KUBERNETES_CLUSTER, query) || {}
    const { error: errorWhileFethingGitSnippets, response: gitConnSnippets } =
      YAMLService.fetchSnippets(YamlEntity.CONNECTOR, Connectors.GIT, query) || {}
    const { error: errorWhileFethingDockerSnippets, response: dockerConnSnippets } =
      YAMLService.fetchSnippets(YamlEntity.CONNECTOR, Connectors.DOCKER, query) || {}
    const { error: errorWhileFethingSecretManagerSnippets, response: secretManagerConnSnippets } =
      YAMLService.fetchSnippets(YamlEntity.CONNECTOR, Connectors.SECRET_MANAGER, query) || {}
    if (errorWhileFethingK8sSnippets) {
      showError(errorWhileFethingK8sSnippets)
      return
    }
    if (errorWhileFethingGitSnippets) {
      showError(errorWhileFethingGitSnippets)
      return
    }
    if (errorWhileFethingDockerSnippets) {
      showError(errorWhileFethingDockerSnippets)
      return
    }
    if (errorWhileFethingSecretManagerSnippets) {
      showError(errorWhileFethingSecretManagerSnippets)
      return
    }
    addIconInfoToSnippets(pickIconForEntity(Connectors.KUBERNETES_CLUSTER), k8sConnSnippets)
    addIconInfoToSnippets(pickIconForEntity(Connectors.GIT), gitConnSnippets)
    addIconInfoToSnippets(pickIconForEntity(Connectors.DOCKER), dockerConnSnippets)
    addIconInfoToSnippets('main-code-yaml', secretManagerConnSnippets)
    setSnippets([
      ...(k8sConnSnippets || []),
      ...(gitConnSnippets || []),
      ...(dockerConnSnippets || []),
      ...(secretManagerConnSnippets || [])
    ])
  }

  useEffect(() => {
    fetchSnippets()
  }, [])

  const handleCreate = async (): Promise<void> => {
    const yamlData = yamlHandler?.getLatestYaml()
    let jsonData
    try {
      jsonData = parse(yamlData || '')
    } catch (err) {
      showError(err.message)
    }

    if (yamlData && jsonData) {
      try {
        await createConnector(jsonData as any) // Replace after BE changes api
        showSuccess(i18n.successfullyCreated)
        history.push(`${pathname}/${jsonData.connector?.['identifier']}`)
      } catch (err) {
        showError(err.data?.message)
      }
    }
  }

  return (
    <>
      <PageHeader title={i18n.title} />
      <PageBody>
        <Container padding="xlarge">
          <YAMLBuilder
            fileName={i18n.newConnector}
            entityType={YamlEntity.CONNECTOR}
            bind={setYamlHandler}
            snippets={snippets}
            showIconMenu={true}
          />
          <Button text="Create" intent="primary" margin={{ top: 'xlarge' }} onClick={handleCreate} />
        </Container>
      </PageBody>
    </>
  )
}

export default CreateConnectorFromYamlPage
