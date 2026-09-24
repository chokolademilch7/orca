import { isTextBlock } from '../../../src/shared/native-chat-types'
import type { NativeChatMessage } from '../../../src/shared/native-chat-types'

/** The message's prose as one string, for the clipboard and the selection screen. Tool calls and
 *  images carry nothing a person would paste, so they are skipped. */
export function nativeChatMessagePlainText(message: Pick<NativeChatMessage, 'blocks'>): string {
  return message.blocks
    .filter(isTextBlock)
    .map((block) => block.text.trim())
    .filter((text) => text.length > 0)
    .join('\n\n')
}
