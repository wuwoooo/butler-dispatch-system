/* eslint-disable @typescript-eslint/no-explicit-any */
declare const wx: any;
declare function App(options: Record<string, any> & ThisType<any>): void;
declare function Page(options: Record<string, any> & ThisType<any>): void;
declare function Component(options: Record<string, any> & ThisType<any>): void;
declare function getApp<T = any>(): T;
declare function getCurrentPages(): Array<{ route?: string }>;

type AnyRecord = Record<string, any>;
