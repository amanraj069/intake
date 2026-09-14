import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { uploadFoodImageFile } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  chatHistorySchema,
  chatMessageIdSchema,
  confirmChatActionSchema,
  retryChatMessageSchema,
  sendChatMessageSchema,
} from '../schemas/chat.schema';
import * as chatController from '../controllers/chat.controller';

const router = Router();

router.use(requireAuth);

router.get('/history', validate(chatHistorySchema), chatController.getChatHistory);
// The optional photo is parsed before validation, since multipart text fields
// only reach `req.body` once multer has read the form. JSON requests pass through untouched.
router.post('/', uploadFoodImageFile, validate(sendChatMessageSchema), chatController.sendChatMessage);
router.post('/messages/:messageId/retry', validate(retryChatMessageSchema), chatController.retryChatMessage);
router.delete('/messages/:messageId', validate(chatMessageIdSchema), chatController.deleteChatMessage);
router.post('/messages/:messageId/restore', validate(chatMessageIdSchema), chatController.restoreChatMessage);
router.post('/confirm-action', validate(confirmChatActionSchema), chatController.confirmChatAction);

export default router;
