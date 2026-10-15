import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme';
import { IconButton } from '../ui';

/** Nút chuyển sáng/tối trên topbar */
export function ThemeToggle() {
  const [theme, toggle] = useTheme();
  const dark = theme === 'dark';
  return (
    <IconButton label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'} onClick={toggle} outline>
      {dark ? <Sun /> : <Moon />}
    </IconButton>
  );
}
