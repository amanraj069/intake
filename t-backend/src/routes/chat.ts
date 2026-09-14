import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { chatHistorySchema, confirmChatActionSchema, sendChatMessageSchema } from '../schemas/chat.schema';
import * as chatController from '../controllers/chat.controller';

const router = Router();

router.use(requireAuth);

router.get('/history', validate(chatHistorySchema), chatController.getChatHistory);
router.post('/', validate(sendChatMessageSchema), chatController.sendChatMessage);
router.post('/confirm-action', validate(confirmChatActionSchema), chatController.confirmChatAction);

export default router;
