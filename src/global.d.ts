import { Context } from 'grammy';

declare module 'grammy' {
  interface Context {
    prefixCommand?: string;
  }
}
