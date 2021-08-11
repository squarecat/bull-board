import React, { useState } from 'react';

import { AppQueue } from '@bull-board/api/typings/app';
import { NavLink } from 'react-router-dom';
import { STATUS_LIST } from '../../constants/status-list';
import { SearchIcon } from '../Icons/Search';
import { Store } from '../../hooks/useStore';
import cn from 'clsx';
import s from './Menu.module.css';

export const Menu = ({
  queues,
  selectedStatuses,
}: {
  queues: AppQueue[] | undefined;
  selectedStatuses: Store['selectedStatuses'];
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <aside className={s.aside}>
      <div className={s.secondary}>QUEUES</div>

      {(queues?.length || 0) > 5 && (
        <div className={s.searchWrapper}>
          <SearchIcon />
          <input
            className={s.search}
            type="search"
            id="search-queues"
            placeholder="Filter queues"
            value={searchTerm}
            onChange={({ currentTarget }) => setSearchTerm(currentTarget.value)}
          />
        </div>
      )}
      <nav>
        {!!queues && (
          <ul className={s.menu}>
            {queues
              .filter(({ name }) => name.includes(searchTerm))
              .map(({ name: queueName, isPaused, counts }) => {
                const p = calculateCountPercentages(counts);
                return (
                  <li key={queueName}>
                    <NavLink
                      to={`/queue/${encodeURIComponent(queueName)}${
                        !selectedStatuses[queueName] ||
                        selectedStatuses[queueName] === STATUS_LIST[0]
                          ? ''
                          : `?status=${selectedStatuses[queueName]}`
                      }`}
                      activeClassName={s.active}
                      title={queueName}
                    >
                      {queueName} {isPaused && <span className={s.isPaused}>[ Paused ]</span>}
                      <span className={s.counts}>
                        {p.map(({ percentage, label, count }) => {
                          return (
                            <span
                              key={label}
                              className={s.count}
                              style={{ height: `${percentage}%` }}
                              data-count={count}
                              data-label={label}
                            ></span>
                          );
                        })}
                      </span>
                    </NavLink>
                  </li>
                );
              })}
          </ul>
        )}
      </nav>
      <div className={cn(s.appVersion, s.secondary)}>{process.env.APP_VERSION}</div>
    </aside>
  );
};

const shown: string[] = ['completed', 'waiting', 'failed'];
type PercentageArray = { count: number; percentage: number; label: string }[];

function calculateCountPercentages(counts: any): PercentageArray {
  const total = shown.reduce<number>((out, key) => {
    return out + counts[key];
  }, 0);
  return shown.reduce<PercentageArray>((out, key) => {
    return [
      ...out,
      {
        count: counts[key],
        percentage: (counts[key] / total) * 100,
        label: key,
      },
    ];
  }, []);
}
