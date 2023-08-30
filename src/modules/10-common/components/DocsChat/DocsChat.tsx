/*
 * Copyright 2023 Harness Inc. All rights reserved.
 * Use of this source code is governed by the PolyForm Shield 1.0.0 license
 * that can be found in the licenses directory at the root of this repository, also available at
 * https://polyformproject.org/wp-content/uploads/2020/06/PolyForm-Shield-1.0.0.txt.
 */

import React, { useLayoutEffect, useRef, useState } from 'react'
import cx from 'classnames'
import { Avatar, Container, Icon, Layout, PageSpinner, Popover, Tag, Text, useToggleOpen } from '@harness/uicore'
import { Color, FontVariation } from '@harness/design-system'
import { Intent, Menu, MenuItem } from '@blueprintjs/core'
import { Link, useParams } from 'react-router-dom'
import { useTelemetry, useTrackEvent } from '@common/hooks/useTelemetry'
import { useGetSettingValue } from 'services/cd-ng'
import { AidaActions } from '@common/constants/TrackingConstants'
import { useHarnessSupportBot } from 'services/notifications'
import { String, useStrings } from 'framework/strings'
import { useAppStore } from 'framework/AppStore/AppStoreContext'
import { SubmitTicketModal } from '@common/components/ResourceCenter/SubmitTicketModal/SubmitTicketModal'
import { useDeepCompareEffect, useLocalStorage } from '@common/hooks'
import { getHTMLFromMarkdown } from '@common/utils/MarkdownUtils'
import routes from '@common/RouteDefinitions'
import { AccountPathProps } from '@common/interfaces/RouteInterfaces'
import { SettingType } from '@common/constants/Utils'
import UsefulOrNot, { AidaClient } from '@common/components/UsefulOrNot/UsefulOrNot'
import css from './DocsChat.module.scss'

const CHAT_HISTORY_KEY = 'aida_chat_history'

interface Message {
  author: 'harness' | 'user'
  text: string
  timestamp?: number
}

const sampleMessages: Array<Message> = [
  {
    author: 'harness',
    text: 'Hi, I can search the Harness Docs for you. How can I help you?',
    timestamp: Date.now()
  }
]

function DocsChat(): JSX.Element {
  const [userInput, setUserInput] = useState('')
  const { currentUserInfo } = useAppStore()
  const { accountId } = useParams<AccountPathProps>()
  const { getString } = useStrings()
  const messageList = useRef<HTMLDivElement>(null)
  const { mutate: askQuestion, loading } = useHarnessSupportBot({})
  const { trackEvent } = useTelemetry()
  const { isOpen, close: closeSubmitTicketModal, open: openSubmitTicketModal } = useToggleOpen()
  const [chatHistory, setChatHistory] = useLocalStorage<Array<Message>>(CHAT_HISTORY_KEY, [], sessionStorage)
  const [messages, setMessages] = useState<Array<Message>>(chatHistory.length > 0 ? chatHistory : sampleMessages)
  const { data: aidaSettingResponse, loading: isAidaSettingLoading } = useGetSettingValue({
    identifier: SettingType.AIDA,
    queryParams: { accountIdentifier: accountId }
  })
  useTrackEvent(AidaActions.ChatStarted, {})

  const getAnswer = async (oldMessages: Array<Message>, query: string): Promise<void> => {
    try {
      const answer = await askQuestion({ question: query })
      if (answer?.data?.response) {
        trackEvent(AidaActions.AnswerReceived, {
          query,
          answer: answer?.data?.response
        })
      }
      setMessages([
        ...oldMessages,
        {
          author: 'harness',
          text: answer?.data?.response || 'Something went wrong'
        } as Message
      ])
    } catch (e) {
      setMessages([
        ...oldMessages,
        {
          author: 'harness',
          text: 'error'
        } as Message
      ])
    }
  }

  const handleUserInput: React.ChangeEventHandler<HTMLInputElement> = e => {
    setUserInput(e.target.value)
    e.preventDefault()
  }

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = e => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmitClick: React.MouseEventHandler<HTMLButtonElement> = () => {
    handleSubmit()
  }

  const handleSubmit = (): void => {
    const userMessage = userInput.trim()

    if (!userMessage) return

    const newMessageList: Message[] = [
      ...messages,
      {
        author: 'user',
        text: userMessage,
        timestamp: Date.now()
      }
    ]

    setMessages(newMessageList)
    getAnswer(newMessageList, userMessage)
    setUserInput('')
  }

  useLayoutEffect(() => {
    // scroll to bottom on every message
    messageList.current?.scrollTo?.(0, messageList.current?.scrollHeight)
  }, [messages])

  useDeepCompareEffect(() => {
    setChatHistory(messages)
  }, [messages])

  const clearHistory = (): void => {
    sessionStorage.removeItem(CHAT_HISTORY_KEY)
    setMessages(sampleMessages)
  }

  const loadingMessage = (
    <div className={cx(css.messageContainer, css.harness)}>
      <Icon name="harness-copilot" size={30} className={css.aidaIcon} />
      <div className={cx(css.message, css.loader)}>
        <div className={css.dotflashing}></div>
      </div>
    </div>
  )

  if (isAidaSettingLoading) return <PageSpinner />

  return (
    <div className={css.container}>
      <Layout.Vertical spacing={'small'} className={css.header}>
        <Layout.Horizontal spacing={'small'} style={{ alignItems: 'center' }}>
          <Icon name="harness-copilot" size={32} />
          <Text font={{ size: 'medium', weight: 'bold' }} color={Color.BLACK}>
            <String stringID="common.csBot.title" />
          </Text>
          <Tag intent={Intent.PRIMARY}>
            <String stringID="common.csBot.beta" />
          </Tag>
        </Layout.Horizontal>
        <Layout.Horizontal spacing={'xsmall'} style={{ alignItems: 'center' }}>
          <String stringID="common.csBot.subtitle" />
          <a href="https://developer.harness.io" rel="noreferrer nofollow" target="_blank">
            <String stringID="common.csBot.hdh" />
          </a>
          <Icon name="main-share" size={12} />
        </Layout.Horizontal>
      </Layout.Vertical>

      {aidaSettingResponse?.data?.value != 'true' ? (
        <Container background={Color.PRIMARY_1} padding="medium" margin="medium">
          <Text font={{ variation: FontVariation.BODY2 }} margin={{ bottom: 'medium' }} icon="info-messaging">
            <String stringID="common.csBot.turnOn" />
          </Text>
          <Text font={{ variation: FontVariation.BODY }} margin={{ bottom: 'medium' }}>
            <String stringID="common.csBot.eulaNotAccepted" />
          </Text>
          <Link to={routes.toDefaultSettings({ accountId })}>
            <String stringID="common.csBot.reviewEula" />
          </Link>
        </Container>
      ) : (
        <>
          <div className={css.messagesContainer} ref={messageList}>
            {messages.map((message, index) => {
              return (
                <div key={message.text + index}>
                  <div
                    className={cx(css.messageContainer, {
                      [css.harness]: message.author === 'harness',
                      [css.user]: message.author === 'user'
                    })}
                  >
                    {message.author === 'harness' ? (
                      <Icon name="harness-copilot" size={30} className={css.aidaIcon} />
                    ) : null}
                    <div className={css.message}>
                      {message.text === 'error' ? (
                        <a href="javascript:;" onClick={openSubmitTicketModal} className={css.errorLink}>
                          {getString('common.csBot.errorMessage')}
                        </a>
                      ) : (
                        <div dangerouslySetInnerHTML={{ __html: getHTMLFromMarkdown(message.text) }} />
                      )}
                    </div>
                    {message.author === 'user' ? (
                      <Avatar
                        size={'small'}
                        name={currentUserInfo.name}
                        email={currentUserInfo.email}
                        hoverCard={false}
                      />
                    ) : null}
                  </div>
                  {message.author === 'harness' && index > 1 ? (
                    <UsefulOrNot
                      allowCreateTicket={true}
                      telemetry={{
                        aidaClient: AidaClient.CS_BOT,
                        metadata: {
                          answer: message.text,
                          query: messages[index - 1].text
                        }
                      }}
                    />
                  ) : null}
                </div>
              )
            })}
            {loading ? loadingMessage : null}
          </div>
          <div className={css.inputContainer}>
            <Popover minimal>
              <button className={css.chatMenuButton}>
                <Icon name="menu" size={12} />
              </button>
              <Menu>
                <MenuItem text={getString('common.clearHistory')} onClick={clearHistory} />
              </Menu>
            </Popover>
            <input
              type="text"
              autoFocus
              name="user-input"
              className={css.input}
              value={userInput}
              onChange={handleUserInput}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              placeholder={getString('common.csBot.placeholder')}
            />
            <button onClick={handleSubmitClick} className={css.submitButton}>
              <Icon name="pipeline-deploy" size={24} />
            </button>
          </div>
          <SubmitTicketModal isOpen={isOpen} close={closeSubmitTicketModal} />
        </>
      )}
    </div>
  )
}

export default DocsChat
