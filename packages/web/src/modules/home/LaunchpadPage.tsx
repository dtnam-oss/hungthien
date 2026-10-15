import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth-context';
import { NAV_GROUPS, isSubMenu } from '../../shared/nav-config';
import type { NavItem } from '../../shared/nav-config';
import { PageHeader, SectionTitle, NewTag } from '../../shared/ui';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

export function LaunchpadPage() {
  const { hasPermission, isLoading, user } = useAuth();

  const filteredGroups = useMemo(() => {
    if (isLoading) return [];
    return NAV_GROUPS
      .map((group) => {
        const flatItems: NavItem[] = [];
        for (const item of group.items) {
          if (isSubMenu(item)) flatItems.push(...item.children.filter((c) => hasPermission(c.module, 'canView')));
          else if (hasPermission(item.module, 'canView')) flatItems.push(item);
        }
        return { key: group.key, label: group.label, flatItems };
      })
      .filter((g) => g.flatItems.length > 0);
  }, [hasPermission, isLoading]);

  return (
    <div className="page" style={{ gap: 28 }}>
      <PageHeader
        title={`${greeting()}, ${user?.username || 'bạn'}!`}
        description="Chọn chức năng để bắt đầu làm việc. Nhấn Ctrl K để tìm nhanh."
      />

      {filteredGroups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          <SectionTitle>{group.label}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {group.flatItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.key} to={item.path} className="tile">
                  <span className="tile-icon"><Icon /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="tile-title">{item.label}</span>
                      {item.isNew && <NewTag />}
                    </span>
                    <span className="tile-desc truncate-2 block">{item.description}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
