import type { MessageInstance } from 'antd/es/message/interface';
import type { ModalStaticFunctions } from 'antd/es/modal/confirm';
import type { NotificationInstance } from 'antd/es/notification/interface';

let message: MessageInstance;
let modal: Omit<ModalStaticFunctions, 'warn'>;
let notification: NotificationInstance;

export const antdGlobal = {
  get message() {
    return message;
  },
  set message(val) {
    message = val;
  },
  get modal() {
    return modal;
  },
  set modal(val) {
    modal = val;
  },
  get notification() {
    return notification;
  },
  set notification(val) {
    notification = val;
  },
};
