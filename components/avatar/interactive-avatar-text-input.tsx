import React from 'react'
import { Input, Spinner, Tooltip } from '@nextui-org/react'
import { Airplane, ArrowRight, PaperPlaneRight } from '@phosphor-icons/react'
import clsx from 'clsx'
import { useAIState, useActions, useUIState } from '@ai-sdk/rsc'
import { UserMessage } from '../stocks/message'
interface StreamingAvatarTextInputProps {
  label: string
  placeholder: string
  endContent?: React.ReactNode
  disabled?: boolean
  loading?: boolean
}
import type { AI } from '@/lib/chat/actions'
import { nanoid } from 'nanoid'
export default function InteractiveAvatarTextInput({
  label,
  placeholder,
  endContent,
  disabled = false,
  loading = false
}: StreamingAvatarTextInputProps) {
  const { submitUserMessage } = useActions()
  const [input, setInput] = React.useState('')
  const [messages, setMessages] = useUIState<typeof AI>()

  async function handleSubmit(
    e?:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e?.preventDefault()
    if (input.trim() === '') {
      return
    }

    setMessages(currentMessages => [
      ...currentMessages,
      {
        id: nanoid(),
        display: <UserMessage>{input}</UserMessage>
      }
    ])

    const responseMessage = await submitUserMessage(input)

    setMessages(currentMessages => [...currentMessages, responseMessage])

    setInput('')
  }
  return (
    <Input
      endContent={
        <div className="flex flex-row items-center h-full">
          {endContent}
          <Tooltip content="Send message">
            {loading ? (
              <Spinner
                className="text-indigo-300 hover:text-indigo-200"
                size="sm"
                color="default"
              />
            ) : (
              <button
                type="submit"
                className="focus:outline-none"
                onClick={handleSubmit}
              >
                <PaperPlaneRight
                  className={clsx(
                    'text-indigo-300 hover:text-indigo-200',
                    disabled && 'opacity-50'
                  )}
                  size={24}
                />
              </button>
            )}
          </Tooltip>
        </div>
      }
      label={label}
      placeholder={placeholder}
      size="sm"
      onKeyDown={e => {
        if (e.key === 'Enter') {
          handleSubmit()
        }
      }}
      onValueChange={setInput}
      isDisabled={disabled}
      value={input}
    />
  )
}
