import React from 'react'
import { StepWizard, Color } from '@wings-software/uicore'
import { useStrings } from 'framework/strings'
import type { NgSmtpDTO } from 'services/cd-ng'
import StepSmtpDetails from './views/StepDetails'
import StepCredentials from './views/StepCredentials'
import StepTestConnection from './views/StepTestConnection'

export interface CreateSmtpWizardProps {
  onSuccess?: (smtp: NgSmtpDTO) => void
  hideModal?: () => void
}

export interface SmtpSharedObj {
  detailsData?: NgSmtpDTO
  isEdit?: boolean
}

const CreateSmtpWizard: React.FC<CreateSmtpWizardProps & SmtpSharedObj> = props => {
  const { getString } = useStrings()

  return (
    <StepWizard icon="smtp" iconProps={{ size: 56, color: Color.WHITE }} title={getString('common.smtp.conifg')}>
      <StepSmtpDetails name={getString('details')} {...props} />
      <StepCredentials name={getString('credentials')} {...props} />
      <StepTestConnection name={getString('common.smtp.testConnection')} {...props} />
    </StepWizard>
  )
}

export default CreateSmtpWizard
