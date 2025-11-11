import Document, { Html, Head, Main, NextScript } from 'next/document';
import type { JSX } from 'react';

export default class YenticDocument extends Document {
  override render(): JSX.Element {
    return (
      <Html lang="en">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
