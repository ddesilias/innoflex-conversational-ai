import { AVATARS, VOICES } from '@/app/avatar/lib/constants'
import {
  Configuration,
  NewSessionData,
  StreamingAvatarApi
} from '@heygen/streaming-avatar'
import {
  Button,
  Input,
  Select,
  SelectItem,
  Spinner,
  Tooltip
} from '@nextui-org/react'
import { Microphone, MicrophoneStage } from '@phosphor-icons/react'
import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import InteractiveAvatarTextInput from './interactive-avatar-text-input'
import { useActions, useUIState } from '@ai-sdk/rsc'
import type { AI } from '@/lib/chat/actions'
import { Message, Session } from '@/lib/types'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatList } from '@/components/chat-list'
export default function InteractiveAvatar({
  aiMessage,
  messages,
  isShared,
  session
}: {
  aiMessage: string
  messages: any
  isShared: boolean
  session: Session
}) {
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [isLoadingRepeat, setIsLoadingRepeat] = useState(false)
  const [isLoadingChat, setIsLoadingChat] = useState(false)
  const [stream, setStream] = useState<MediaStream>()
  const [debug, setDebug] = useState<string>()
  const [data, setData] = useState<NewSessionData>()
  const [text, setText] = useState<string>('')
  const [initialized, setInitialized] = useState(false) // Track initialization
  const [recording, setRecording] = useState(false) // Track recording state
  const mediaStream = useRef<HTMLVideoElement>(null)
  const avatar = useRef<StreamingAvatarApi | null>(null)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const audioChunks = useRef<Blob[]>([])
  const avatarId = AVATARS[0].avatar_id
  const voiceId = VOICES[0].voice_id
  // Function to send the ChatGPT response to the Interactive Avatar
  const sendResponseToAvatar = async (message: string) => {
    if (!avatar.current || !data?.sessionId) {
      setDebug('Avatar API not initialized or session ID missing')
      return
    }
    if (typeof message !== 'string') {
      return
    }

    try {
      await avatar.current.speak({
        taskRequest: { text: message, sessionId: data.sessionId }
      })
    } catch (e) {
      console.error('Error sending message to avatar:', e)
    }
  }
  useEffect(() => {
    if (aiMessage) {
      console.log('Sending message to avatar:', aiMessage)
      sendResponseToAvatar(aiMessage)
    }
  }, [aiMessage])

  async function fetchAccessToken() {
    try {
      const response = await fetch('/avatar/api/get-access-token', {
        method: 'POST'
      })
      const token = await response.text()
      console.log('Access Token:', token) // Log the token to verify
      return token
    } catch (error) {
      console.error('Error fetching access token:', error)
      return ''
    }
  }

  async function startSession() {
    console.log(
      'Starting session with avatarId:',
      avatarId,
      'and voiceId:',
      voiceId
    )
    setIsLoadingSession(true)
    await updateToken()
    if (!avatar.current) {
      setDebug('Avatar API is not initialized')
      return
    }
    try {
      const res = await avatar.current.createStartAvatar(
        {
          newSessionRequest: {
            quality: 'low',
            avatarName: avatarId,
            voice: { voiceId: voiceId }
          }
        },
        setDebug
      )
      setData(res)
      setStream(avatar.current.mediaStream)
    } catch (error) {
      console.error('Error starting avatar session:', error)
      setDebug(
        `There was an error starting the session. ${voiceId ? 'This custom voice ID may not be supported.' : ''}`
      )
    }
    setIsLoadingSession(false)
  }

  async function updateToken() {
    const newToken = await fetchAccessToken()
    console.log('Updating Access Token:', newToken) // Log token for debugging
    avatar.current = new StreamingAvatarApi(
      new Configuration({ accessToken: newToken })
    )

    const startTalkCallback = (e: any) => {
      console.log('Avatar started talking', e)
    }

    const stopTalkCallback = (e: any) => {
      console.log('Avatar stopped talking', e)
    }

    console.log('Adding event handlers:', avatar.current)
    avatar.current.addEventHandler('avatar_start_talking', startTalkCallback)
    avatar.current.addEventHandler('avatar_stop_talking', stopTalkCallback)

    setInitialized(true)
  }

  async function handleInterrupt() {
    if (!initialized || !avatar.current) {
      setDebug('Avatar API not initialized')
      return
    }
    await avatar.current
      .interrupt({ interruptRequest: { sessionId: data?.sessionId } })
      .catch(e => {
        setDebug(e.message)
      })
  }

  async function endSession() {
    if (!initialized || !avatar.current) {
      setDebug('Avatar API not initialized')
      return
    }
    await avatar.current.stopAvatar(
      { stopSessionRequest: { sessionId: data?.sessionId } },
      setDebug
    )
    setStream(undefined)
  }

  async function handleSpeak() {
    setIsLoadingRepeat(true)
    if (!initialized || !avatar.current) {
      setDebug('Avatar API not initialized')
      return
    }
    await avatar.current
      .speak({ taskRequest: { text: text, sessionId: data?.sessionId } })
      .catch(e => {
        setDebug(e.message)
      })
    setIsLoadingRepeat(false)
  }

  useEffect(() => {
    async function init() {
      const newToken = await fetchAccessToken()
      console.log('Initializing with Access Token:', newToken) // Log token for debugging
      avatar.current = new StreamingAvatarApi(
        new Configuration({ accessToken: newToken, jitterBuffer: 200 })
      )
      setInitialized(true) // Set initialized to true
    }
    init()

    return () => {
      endSession()
    }
  }, [])

  useEffect(() => {
    if (stream && mediaStream.current) {
      mediaStream.current.srcObject = stream
      mediaStream.current.onloadedmetadata = () => {
        mediaStream.current!.play()
        setDebug('Playing')
      }
    }
  }, [mediaStream, stream])

  function startRecording() {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder.current = new MediaRecorder(stream)
        mediaRecorder.current.ondataavailable = event => {
          audioChunks.current.push(event.data)
        }
        mediaRecorder.current.onstop = () => {
          const audioBlob = new Blob(audioChunks.current, {
            type: mediaRecorder.current?.mimeType || 'audio/webm'
          })
          audioChunks.current = []
          transcribeAudio(audioBlob)
        }
        mediaRecorder.current.start()
        setRecording(true)
      })
      .catch(error => {
        console.error('Error accessing microphone:', error)
      })
  }

  function stopRecording() {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop()
      setRecording(false)
    }
  }

  async function transcribeAudio(audioBlob: Blob) {
    try {
      if (audioBlob.size > 2 * 1024 * 1024) throw new Error('Recording too large')
      const response = await fetch('/avatar/api/transcribe', {
        method: 'POST', headers: { 'Content-Type': audioBlob.type || 'audio/webm' }, body: audioBlob
      })
      if (!response.ok) throw new Error('Transcription unavailable')
      const result = await response.json()
      setText(result.text)
    } catch (error) {
      setDebug('Transcription indisponible. Réessayez avec un enregistrement plus court.')
    }
  }

  return (
    <div className="size-full">
      {stream ? (
        <div className="flex flex-row">
          {/* Colonne gauche - Vidéo */}
          <div className="basis-1/3">
            <div className="size-80 rounded-full overflow-hidden mx-auto mt-20">
              <video
                className="size-full object-cover"
                ref={mediaStream}
                autoPlay
                playsInline
              >
                <track kind="captions" />
              </video>

              {/* <div className="absolute mx-64 bottom-3 grid grid-cols-2 gap-3 w-[300px]">
              <Button
                size="md"
                onClick={handleInterrupt}
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                variant="shadow"
              >
                Interrupt task
              </Button>
              <Button
                size="md"
                onClick={endSession}
                className="bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
                variant="shadow"
              >
                End session
              </Button>
            </div> */}
            </div>
          </div>
          {/* Colonne droite - Chat */}
          <div className="basis-2/3">
            <div className="relative mx-auto h-[79vh] px-4 my-10 overflow-auto flex flex-col-reverse">
              {messages.length ? (
                <ChatList
                  messages={messages}
                  isShared={isShared}
                  session={session}
                />
              ) : (
                <EmptyScreen />
              )}
            </div>
            {!stream ? null : (
              <div className="fixed bottom-3 w-[60%] mx-10 bg-background shadow-lg sm:rounded-xl sm:border md:py-4">
                <InteractiveAvatarTextInput
                  label=""
                  placeholder="Chat with the avatar"
                  loading={isLoadingChat}
                  endContent={
                    <Tooltip
                      content={
                        !recording ? 'Start recording' : 'Stop recording'
                      }
                    >
                      <Button
                        onClick={!recording ? startRecording : stopRecording}
                        isDisabled={!stream}
                        isIconOnly
                        className={clsx(
                          'mr-4 text-white',
                          !recording
                            ? 'bg-gradient-to-tr from-indigo-500 to-indigo-300'
                            : ''
                        )}
                        size="sm"
                        variant="shadow"
                      >
                        {!recording ? (
                          <Microphone size={20} />
                        ) : (
                          <>
                            <div className="absolute size-full bg-gradient-to-tr from-indigo-500 to-indigo-300 animate-pulse -z-10"></div>
                            <MicrophoneStage size={20} />
                          </>
                        )}
                      </Button>
                    </Tooltip>
                  }
                  disabled={!stream}
                />
              </div>
            )}
          </div>
        </div>
      ) : !isLoadingSession ? (
        <div className="w-[400px] grid grid-rows-2 gap-5 justify-center items-center m-auto my-20">
          <Button
            className="w-full bg-gradient-to-tr from-indigo-500 to-indigo-300 text-white rounded-lg"
            onClick={startSession}
          >
            Start session
          </Button>
          <p>{debug}</p>
          <Spinner size="lg" color="default" />
        </div>
      ) : (
        <Spinner size="lg" color="default" />
      )}
    </div>
  )
}
