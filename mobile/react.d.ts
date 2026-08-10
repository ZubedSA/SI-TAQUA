declare module 'react' {
  const content: any;
  export default content;
  export const useState: any;
  export const useEffect: any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
