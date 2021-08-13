import 'chartjs-adapter-date-fns';

import React, { useEffect, useState } from 'react';

import { Bar } from 'react-chartjs-2/dist';
import { enUS } from 'date-fns/locale';
import s from './Dashboard.module.css';

const options = {
  scales: {
    yAxes: [
      {
        stacked: true,
        ticks: {
          beginAtZero: true,
        },
      },
    ],
    x: {
      title: {
        text: 'Time processed',
      },
      adapters: {
        date: {
          locale: enUS,
        },
      },
      offset: true,
      stacked: true,
      type: 'time',
      time: {
        unit: 'hour',
        round: 'hour',
        displayFormats: {
          day: 'D hh',
        },
      },
    },
  },
};

type Stat = {
  status: 'completed' | 'failed';
  x: Date;
  y: number;
};

export const Dashboard = React.memo(() => {
  const [stats, setStats] = useState<Stat[]>([]);
  useEffect(() => {
    fetch('/api/stats/3af3c1b6-d718-4236-ae5e-d1cfbce30ef5')
      .then((res) => res.json())
      .then((s) =>
        setStats(s.map((d: any) => ({ status: d.status, x: new Date(d.processed), y: d.value })))
      );
  }, []);

  console.log(stats);

  return (
    <section className={s.dash}>
      <h1>Dash</h1>
      <Bar
        data={{
          datasets: [
            {
              label: 'Completed',
              data: stats.filter((s) => s.status === 'completed'),
              backgroundColor: '#54a854',
            },
            {
              label: 'Failed',
              data: stats.filter((s) => s.status === 'failed'),
              backgroundColor: '#d53f3f',
            },
          ],
        }}
        options={options}
      />
    </section>
  );
});
