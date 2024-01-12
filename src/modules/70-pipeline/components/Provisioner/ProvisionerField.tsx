/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useState } from 'react'
import { get } from 'lodash-es'
import { Checkbox, FormInput, Layout, MultiTypeInputType, RUNTIME_INPUT_VALUE } from '@harness/uicore'
import { connect } from 'formik'
import { useStrings } from 'framework/strings'

import css from './ProvisionerField.module.scss'

interface ProvisionerFieldProps {
  isReadonly?: boolean
  name: string
  formik?: any
}

function ProvisionerField(props: ProvisionerFieldProps): React.ReactElement {
  const { name, formik, isReadonly } = props
  const { getString } = useStrings()
  const [isProvisioner, setIsProvisioner] = useState<boolean>(false)

  React.useEffect(() => {
    if (get(formik.values, name)) {
      setIsProvisioner(true)
    }
  }, [formik?.values[name]])

  return (
    <>
      <Layout.Vertical className={css.provisionerField}>
        <Checkbox
          margin={{ bottom: 'medium' }}
          checked={isProvisioner}
          onChange={(e: React.FormEvent<HTMLInputElement>) => {
            /* istanbul ignore next */
            if (!e?.currentTarget.checked) {
              formik.setFieldValue(name, '')
            } else {
              formik.setFieldValue(name, RUNTIME_INPUT_VALUE)
            }
            setIsProvisioner(e.currentTarget.checked)
          }}
          /* eslint-disable */
          label={getString('cd.steps.pdcStep.dynamicProvision')}
        />
        {isProvisioner && (
          <FormInput.MultiTextInput
            multiTextInputProps={{
              allowableTypes: [MultiTypeInputType.RUNTIME]
            }}
            data-testid="provisioner-field"
            label={getString('common.provisioner')}
            disabled={isReadonly}
            name={name}
          />
        )}
      </Layout.Vertical>
    </>
  )
}

export default connect(ProvisionerField)
