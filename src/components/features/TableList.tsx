import type { CompetitionParticipant, CompetitionTable } from '../../types';
import { TableCard } from './TableCard';
import styles from './TableList.module.css';

interface TableListProps {
  tables: CompetitionTable[];
  participants: CompetitionParticipant[];
  onTableClick: (table: CompetitionTable) => void;
}

export const TableList = ({ tables, participants, onTableClick }: TableListProps) => {
  if (tables.length === 0) {
    return <p className={styles.empty}>卓がまだ作成されていません</p>;
  }

  return (
    <div className={styles.list}>
      {tables.map((table) => (
        <TableCard
          key={table.id}
          table={table}
          participants={participants}
          onClick={() => onTableClick(table)}
        />
      ))}
    </div>
  );
};
