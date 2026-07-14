import { DARK_THEME_COLOR, LIGHT_THEME_COLOR, THEME_STORAGE_KEY } from "@/components/theme/constants";

const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=localStorage.getItem(k);if(p!=="system"&&p!=="dark"&&p!=="light")p="dark";var r=p==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):p;var d=document.documentElement;d.dataset.theme=r;d.dataset.themePreference=p;d.style.colorScheme=r;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",r==="light"?${JSON.stringify(LIGHT_THEME_COLOR)}:${JSON.stringify(DARK_THEME_COLOR)});}catch(e){document.documentElement.dataset.theme="dark";document.documentElement.dataset.themePreference="dark";document.documentElement.style.colorScheme="dark";}})();`;

export function ThemeScript() {
  return (
    <script
      type="text/javascript"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
