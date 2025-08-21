import { cn } from '@blms/ui';
import { Link } from '@tanstack/react-router';
import {
  TbLayoutSidebar,
  TbLayoutSidebarLeftExpandFilled,
} from 'react-icons/tb';
import PlanBLogoBlack from '../../../assets/logo/planb_logo_horizontal_black.svg?react';
import { MetaElements } from '../meta-elements.tsx';
import type { NavigationSection } from '../props.ts';
import { FlyingMenuSection } from './flying-menu-section.tsx';

export interface FlyingMenuProps {
  sections: NavigationSection[];
  onClickLogin: () => void;
  onClickRegister: () => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
}

export const FlyingMenu = ({
  sections,
  onClickRegister,
  onClickLogin,
  isSidebarOpen,
  setIsSidebarOpen,
}: FlyingMenuProps) => {
  return (
    <nav className="flex w-full flex-row items-center justify-between max-lg:hidden">
      <div className="flex items-center gap-4 px-4 py-3 mr-auto">
        {isSidebarOpen ? (
          <TbLayoutSidebar
            size={24}
            className="text-[#ACACAC] cursor-pointer"
            onClick={() => setIsSidebarOpen(false)}
          />
        ) : (
          <TbLayoutSidebarLeftExpandFilled
            size={24}
            className="text-[#ACACAC] cursor-pointer"
            onClick={() => setIsSidebarOpen(true)}
          />
        )}
        <Link to="/">
          <PlanBLogoBlack className="h-auto w-31" />
        </Link>
      </div>

      <ul
        className={cn(
          'mx-auto flex flex-row items-center gap-2 xl:gap-5 rounded-xl px-3 py-2.5',
          'bg-darkOrange-2 text-black',
        )}
      >
        {sections.map((section) => (
          <li key={section.id}>
            <FlyingMenuSection section={section} />
          </li>
        ))}
      </ul>
      <MetaElements
        onClickLogin={onClickLogin}
        onClickRegister={onClickRegister}
      />
    </nav>
  );
};
