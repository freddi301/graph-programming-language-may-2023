import type { CSSProp } from "styled-components/index";
declare module "react" {
  interface Attributes {
    css?: CSSProp<MyTheme>;
  }
}
