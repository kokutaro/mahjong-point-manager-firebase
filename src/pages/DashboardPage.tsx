import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type TooltipItem,
} from 'chart.js';
import { useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import { DashboardSkeleton } from '../components/skeletons/DashboardSkeleton';
import { Button } from '../components/ui/Button';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useDashboardStats } from '../hooks/useDashboardStats';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const DashboardPage = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { stats, loading, error } = useDashboardStats();

  useEffect(() => {
    if (!error) {
      return;
    }

    console.error(error);
    showSnackbar('Failed to load stats');
  }, [error, showSnackbar]);

  if (loading) return <DashboardSkeleton />;
  if (!stats) return <div>No data</div>;

  const winRate = stats.validHands > 0 ? (stats.winCount / stats.validHands) * 100 : 0;
  const dealInRate = stats.validHands > 0 ? (stats.dealInCount / stats.validHands) * 100 : 0;
  const avgWinPoint = stats.winCount > 0 ? stats.totalWinPoints / stats.winCount : 0;
  const avgDealInPoint = stats.dealInCount > 0 ? stats.totalDealInPoints / stats.dealInCount : 0;

  const riichiRate = stats.validHands > 0 ? (stats.riichiCount / stats.validHands) * 100 : 0;
  // Denominator for *AfterRiichi* should be riichiCount? Or Total Hands?
  // Usually "Riichi Win Rate" = "When I make Riichi, how often do I win?" -> winsAfterRiichi / riichiCount.
  // "Riichi Deal-in Rate" = "When I make Riichi, how often do I deal in?" -> dealInsAfterRiichi / riichiCount.
  const winRateAfterRiichi =
    stats.riichiCount > 0 ? (stats.winsAfterRiichi / stats.riichiCount) * 100 : 0;
  const dealInRateAfterRiichi =
    stats.riichiCount > 0 ? (stats.dealInsAfterRiichi / stats.riichiCount) * 100 : 0;

  return (
    <div
      style={{
        padding: '24px',
        maxWidth: '800px',
        margin: '0 auto',
        color: '#fff',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '24px' }}>プレイヤー戦績</h2>
        <Button variant="secondary" onClick={() => navigate('/')}>
          トップへ
        </Button>
      </div>

      {/* Key Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <MetricCard label="対戦数" value={`${stats.totalGames}戦`} />
        <MetricCard label="平均順位" value={stats.averageRank.toFixed(2)} highlight />
        <MetricCard label="和了率" value={`${winRate.toFixed(1)}%`} />
        <MetricCard label="放銃率" value={`${dealInRate.toFixed(1)}%`} />
        <MetricCard label="平均和了点" value={Math.round(avgWinPoint).toLocaleString()} />
        <MetricCard label="平均放銃点" value={Math.round(avgDealInPoint).toLocaleString()} />
        <MetricCard label="リーチ率" value={`${riichiRate.toFixed(1)}%`} />
        <MetricCard
          label="リーチ後和了"
          value={`${winRateAfterRiichi.toFixed(1)}%`}
          subtext={`(${stats.winsAfterRiichi}/${stats.riichiCount})`}
        />
        <MetricCard
          label="リーチ後放銃"
          value={`${dealInRateAfterRiichi.toFixed(1)}%`}
          subtext={`(${stats.dealInsAfterRiichi}/${stats.riichiCount})`}
        />
      </div>

      {/* Rank History Graph */}
      <div
        style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '24px',
          borderRadius: '12px',
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: '24px' }}>
          順位推移 (直近{stats.rankHistory.length}戦)
        </h3>
        <RankChart data={stats.rankHistory} />
      </div>
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  highlight = false,
  subtext,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  subtext?: string;
}) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.05)',
      padding: '16px',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: highlight ? '1px solid #ffcc00' : '1px solid rgba(255,255,255,0.1)',
    }}
  >
    <span style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '8px' }}>{label}</span>
    <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</span>
    {subtext && <span style={{ fontSize: '0.7rem', color: '#666' }}>{subtext}</span>}
  </div>
);

const RankChart = ({ data }: { data: { rank: number; date: number }[] }) => {
  if (data.length === 0)
    return (
      <div
        style={{
          height: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
        }}
      >
        No Data
      </div>
    );

  const chartData = {
    labels: data.map((_, i) => i + 1),
    datasets: [
      {
        label: '順位',
        data: data.map((d) => d.rank),
        borderColor: '#4caf50',
        backgroundColor: 'rgba(76, 175, 80, 0.5)',
        tension: 0.1,
        pointRadius: 4,
        pointBackgroundColor: '#4caf50',
      },
    ],
  };

  const options = {
    responsive: true,
    preserveAspectRatio: false,
    scales: {
      y: {
        reverse: true, // Invert Y axis: Rank 1 at top
        min: 0.6,
        max: 4.4,
        ticks: {
          stepSize: 1,
          color: '#aaa',
          callback: (value: number | string) => {
            if (Number(value) >= 1 && Number(value) <= 4) return `${value}位`;
            return '';
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        ticks: {
          color: '#aaa',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (tooltipItems: TooltipItem<'line'>[]) => {
            const index = tooltipItems[0].dataIndex;
            const item = data[index];
            if (!item) return '';
            // Format timestamp
            return new Date(item.date).toLocaleString([], {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
          },
          label: (context: TooltipItem<'line'>) => `${context.parsed.y}位`,
        },
      },
    },
  };

  return (
    <div style={{ position: 'relative', height: '200px', width: '100%' }}>
      <Line options={options} data={chartData} />
    </div>
  );
};
