import React from 'react'
import { toast } from 'sonner'
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
  const [pending, setPending] = React.useState(false)
  const [messages, setMessages] = useUIState<typeof AI>()

  async function handleSubmit(
    e?:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) {
    e?.preventDefault()
    if (pending || loading || disabled || input.trim() === '') {
      return
    }

    const submittedInput = input
    setPending(true)
    setInput('')
    setMessages(currentMessages => [
      ...currentMessages,
      {
        id: nanoid(),
        display: <UserMessage>{input}</UserMessage>
      }
    ])

    try {
      const responseMessage = await submitUserMessage(submittedInput)
      setMessages(currentMessages => [...currentMessages, responseMessage])
    } catch {
      setInput(submittedInput)
      toast.error('La réponse n’a pas pu être générée. Votre message reste disponible pour réessayer.')
    } finally {
      setPending(false)
    }
  }
  return (
    <Input
      endContent={
        <div className="flex flex-row items-center h-full">
          {endContent}
          <Tooltip content="Envoyer le message">
            {loading || pending ? (
              <Spinner
                className="text-indigo-300 hover:text-indigo-200"
                size="sm"
                color="default"
              />
            ) : (
              <button
                type="submit"
                aria-label="Envoyer le message"
                disabled={disabled || pending || loading}
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
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
          handleSubmit()
        }
      }}
      onValueChange={setInput}
      isDisabled={disabled || pending || loading}
      value={input}
    />
  )
}
