/*
 * Copyright 2021 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React from 'react'
import { render, fireEvent, waitFor, getByTestId, act, screen } from '@testing-library/react'
import { TestWrapper } from '@common/utils/testUtils'
import DelegatesListing from '../DelegateListing'
import {
  multipleDelegatesMock,
  singleDelegateResponseMock,
  singleDelegateWithoutTagsResponseMock
} from './DelegateGroupsMock'

jest.mock('@common/components/YAMLBuilder/YamlBuilder')

jest.mock('@common/exports', () => ({
  useToaster: () => ({
    showSuccess: jest.fn(),
    showError: jest.fn()
  }),
  StringUtils: {
    getIdentifierFromName: (name: string) => name
  },
  Page: {
    Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
  },
  useConfirmationDialog: jest.fn().mockImplementation(async ({ onCloseDialog }) => {
    await onCloseDialog(true)
  })
}))

const fetchDelFn = jest.fn().mockImplementation((_sanitizedFilterRequest, { queryParams: { accountId } }) => {
  let data
  if (accountId === 'singleDelegateWithoutTags') {
    data = singleDelegateWithoutTagsResponseMock
  } else if (accountId === 'multipleDelegates') {
    data = multipleDelegatesMock
  } else {
    data = singleDelegateResponseMock
  }
  return data
})

jest.mock('services/portal', () => ({
  useGenerateKubernetesYaml: jest.fn().mockImplementation(() => {
    return {
      mutate: jest.fn().mockImplementation(() => {
        return 'test'
      }),
      data: 'test',
      loading: false,
      error: null,
      refetch: jest.fn().mockImplementation(() => {
        return 'test'
      })
    }
  }),
  useGetInstallationCommand: jest.fn().mockImplementation(() => {
    return {
      mutate: jest.fn(),
      data: { resource: { command: 'test' } },
      loading: false,
      error: null,
      refetch: jest.fn().mockImplementation(() => {
        return {
          data: { resource: { command: 'test' } },
          loading: false,
          error: null
        }
      })
    }
  }),
  useGetDelegatesHeartbeatDetailsV2: jest.fn().mockImplementation(() => {
    return { data: { resource: { numberOfConnectedDelegates: 1 } }, refetch: jest.fn(), error: null, loading: false }
  }),
  useGetDelegateGroupsNGV2WithFilter: jest.fn().mockImplementation(() => {
    return {
      mutate: fetchDelFn,
      loading: false
    }
  }),
  useDeleteDelegateGroupByIdentifier: jest.fn().mockImplementation(() => {
    return {
      mutate: jest.fn()
    }
  })
}))

jest.mock('services/cd-ng', () => ({
  useGenerateTerraformModule: jest.fn().mockImplementation(() => {
    return {
      mutate: jest.fn(),
      data: 'test',
      loading: false,
      error: null,
      refetch: jest.fn().mockImplementation(() => {
        return 'test'
      })
    }
  }),
  useGetFilterList: jest.fn().mockImplementation(() => {
    return {
      mutate: jest.fn()
    }
  }),
  usePostFilter: jest.fn().mockImplementation(() => {
    return {
      mutate: jest.fn()
    }
  }),
  useUpdateFilter: jest.fn().mockImplementation(() => {
    return {
      mutate: jest.fn()
    }
  }),
  useDeleteFilter: jest.fn().mockImplementation(() => {
    return {
      mutate: jest.fn()
    }
  }),
  useIsImmutableDelegateEnabled: jest.fn().mockImplementation(() => {
    return {
      mutate: jest.fn()
    }
  })
}))

describe('Feature flag enabled', () => {
  test('render delegate list and test new delegate button', async () => {
    const { getAllByText } = render(
      <TestWrapper path="/account/:accountId/resources/delegates" pathParams={{ accountId: 'simpleDelegateResponse' }}>
        <DelegatesListing />
      </TestWrapper>
    )
    act(async () => {
      await waitFor(() => {
        const delNames = getAllByText('delegate.DelegateName')
        fireEvent.click(delNames[0]!)
      })
    })
    await waitFor(() => {
      expect(document.body.querySelector('.bp3-dialog')).toBeDefined()
    })
  })
})

describe('search delegate', () => {
  test('render search delegates', async () => {
    const { container } = render(
      <TestWrapper path="/account/:accountId/resources/delegates" pathParams={{ accountId: 'multipleDelegates' }}>
        <DelegatesListing />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(container.innerHTML).toContain('delegate-1')
    })

    await waitFor(async () => {
      const searchBox = container.querySelector('.bp3-input')
      act(() => {
        fireEvent.change(searchBox!, { target: { value: 'Group1' } })
      })
      expect(container.innerHTML).toContain('Group1')
    })
  })
})

describe('verify troubleshootlink', () => {
  test('open troubleshootlink', async () => {
    const { container } = render(
      <TestWrapper path="/account/:accountId/resources/delegates" pathParams={{ accountId: 'multipleDelegates' }}>
        <DelegatesListing />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(container.innerHTML).toContain('delegate-1')
    })

    act(async () => {
      await fireEvent.click(container.querySelector('.troubleshootLink')!)
    })

    const dialog = document.body.querySelector('.bp3-portal')!
    expect(dialog).toBeTruthy()
  })
})

describe('Filter delegate', () => {
  test('Open filter drawer and apply filter', async () => {
    const { container } = render(
      <TestWrapper path="/account/:accountId/resources/delegates" pathParams={{ accountId: 'multipleDelegates' }}>
        <DelegatesListing />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(container.innerHTML).toContain('delegate-1')
    })

    const filterBtn = container.querySelector('#ngfilterbtn')!

    act(async () => {
      await fireEvent.click(filterBtn!)
    })

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('bp3-portal')
    })

    const portal = document.getElementsByClassName('bp3-portal')[0]
    expect(portal).toBeTruthy()

    const delegateNameInput = portal.querySelector('input[name="delegateName"]')
    act(async () => {
      await fireEvent.change(delegateNameInput!, { target: { value: 'Group1' } })
    })

    const applyBtn = portal.querySelector('button')
    act(async () => {
      await fireEvent.click(applyBtn!)
    })

    await waitFor(() => {
      expect(document.body.innerHTML).toContain('Group1')
    })
  })
})

describe('Delegates Listing With Groups', () => {
  test('render data', () => {
    const { container } = render(
      <TestWrapper path="/account/:accountId/resources/delegates" pathParams={{ accountId: 'multipleDelegates' }}>
        <DelegatesListing />
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
  })
  test('click on delegate row', async () => {
    const { getAllByText, container } = render(
      <TestWrapper path="/account/:accountId/resources/delegates" pathParams={{ accountId: 'multipleDelegates' }}>
        <DelegatesListing />
      </TestWrapper>
    )
    act(async () => {
      await waitFor(() => {
        const connected = getAllByText('connected')
        fireEvent.click(connected[0])
      })
    })
    await waitFor(() => {
      getByTestId(container, 'location').innerText &&
        expect(getByTestId(container, 'location').innerText).toContain(
          '/account/multipleDelegates/admin/resources/delegates/delegate1'
        )
    })
  })
})

describe('Delegates Listing without tags', () => {
  test('render data', () => {
    const { container } = render(
      <TestWrapper
        path="/account/:accountId/resources/delegates"
        pathParams={{ accountId: 'singleDelegateWithoutTags' }}
      >
        <DelegatesListing />
      </TestWrapper>
    )
    expect(container).toMatchSnapshot()
  })
})

describe('Test delegate buttons', () => {
  test('click on new delegate', async () => {
    const { container } = render(
      <TestWrapper
        path="/account/:accountId/resources/delegates"
        pathParams={{ accountId: 'singleDelegateWithoutTags' }}
      >
        <DelegatesListing />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(container.getElementsByTagName('button')[0]).toBeDefined()
    })

    const newDelegateBtn: HTMLElement = container.getElementsByTagName('button')[0]
    act(() => {
      fireEvent.click(newDelegateBtn!)
    })

    // Ensure that "DelegateCommandLineCreation" drawer opens
    await waitFor(() => {
      expect(screen.getByText('platform.delegates.commandLineCreation.selectyourDelegate')).toBeInTheDocument()
    })
  })
  test('click on filter', async () => {
    const { container } = render(
      <TestWrapper
        path="/account/:accountId/resources/delegates"
        pathParams={{ accountId: 'singleDelegateWithoutTags' }}
      >
        <DelegatesListing />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(container.getElementsByTagName('button')[1]).toBeDefined()
    })

    const filterBtn: HTMLElement = container.getElementsByTagName('button')[1]
    act(() => {
      fireEvent.click(filterBtn!)
    })

    // Ensure that "Filter" drawer opens
    await waitFor(() => {
      expect(screen.getByText('platform.delegates.delegateIdentifier')).toBeInTheDocument()
    })
  })
})
