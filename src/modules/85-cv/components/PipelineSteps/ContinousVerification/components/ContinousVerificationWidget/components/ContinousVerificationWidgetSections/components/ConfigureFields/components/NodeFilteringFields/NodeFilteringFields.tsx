import React from 'react'
import { Accordion, AllowedTypes } from '@harness/uicore'
import { useStrings } from 'framework/strings'
import NodeFilteringFieldsDetail from './NodeFilteringFieldsDetail'

interface NodeFilteringFieldsProps {
  allowableTypes: AllowedTypes
  readonly?: boolean
}

export default function NodeFilteringFields({ allowableTypes, readonly }: NodeFilteringFieldsProps): JSX.Element {
  const { getString } = useStrings()

  return (
    <Accordion>
      <Accordion.Panel
        id="NodeFilteringFields"
        details={<NodeFilteringFieldsDetail allowableTypes={allowableTypes} readonly={readonly} />}
        summary={getString('projectsOrgs.optional')}
      />
    </Accordion>
  )
}
