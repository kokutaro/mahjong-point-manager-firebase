import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/useAuth';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useCompetitionSeries } from '../hooks/useCompetitionSeries';
import {
  addCompetitionSeriesMember,
  addSeriesMembersToCompetition,
  linkCompetitionParticipantToSeriesMember,
  linkCompetitionToSeries,
  unlinkCompetitionFromSeries,
  updateCompetitionSeriesMember,
} from '../services/competitionSeriesService';
import { aggregateCompetitionSeriesStandings } from '../utils/competitionSeries';
import { formatAverageRank, formatPoint } from '../utils/formatUtils';
import { generateId } from '../utils/id';
import styles from './CompetitionSeriesDashboardPage.module.css';

const formatDate = (date?: string): string => {
  if (!date) return '未設定';
  return new Date(`${date}T00:00:00`).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const pointClass = (point: number): string => {
  if (point > 0) return styles.positive;
  if (point < 0) return styles.negative;
  return '';
};

export const CompetitionSeriesDashboardPage = () => {
  const { seriesId = '' } = useParams<{ seriesId: string }>();
  const { uid } = useAuth();
  const { showSnackbar } = useSnackbar();
  const { series, members, rounds, loading } = useCompetitionSeries(seriesId);
  const [memberName, setMemberName] = useState('');
  const [memberUserId, setMemberUserId] = useState('');
  const [competitionId, setCompetitionId] = useState('');
  const [roundNumber, setRoundNumber] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const canManage =
    series?.organizerId === uid || Boolean(uid && series?.coOrganizerIds.includes(uid));
  const nextRoundNumber = Math.max(0, ...rounds.map((item) => item.round.roundNumber)) + 1;
  const aggregation = useMemo(
    () =>
      aggregateCompetitionSeriesStandings(
        members,
        rounds.flatMap((item) =>
          item.competition
            ? [
                {
                  competitionId: item.competition.id,
                  competitionName: item.competition.name,
                  roundNumber: item.round.roundNumber,
                  participants: item.participants,
                  gameResults: item.gameResults,
                },
              ]
            : [],
        ),
      ),
    [members, rounds],
  );

  const runMutation = async (
    action: () => Promise<void>,
    successMessage: string,
  ): Promise<boolean> => {
    setSaving(true);
    try {
      await action();
      showSnackbar(successMessage);
      return true;
    } catch (error) {
      console.error('Failed to update competition series:', error);
      showSnackbar(error instanceof Error ? error.message : '更新に失敗しました');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    const name = memberName.trim();
    if (!name) return;
    const saved = await runMutation(
      () =>
        addCompetitionSeriesMember(seriesId, {
          id: generateId(),
          name,
          userId: memberUserId.trim() || undefined,
          active: true,
        }),
      'シリーズ参加者を追加しました',
    );
    if (!saved) return;
    setMemberName('');
    setMemberUserId('');
  };

  const handleLinkCompetition = async () => {
    const parsedRoundNumber = Number(roundNumber);
    if (!competitionId.trim() || !Number.isInteger(parsedRoundNumber)) return;
    const saved = await runMutation(
      () => linkCompetitionToSeries(seriesId, competitionId.trim(), parsedRoundNumber),
      '既存大会をシリーズへ紐付けました',
    );
    if (!saved) return;
    setCompetitionId('');
    setRoundNumber('');
  };

  const toggleSelectedMember = (targetCompetitionId: string, memberId: string) => {
    setSelectedMembers((current) => {
      const selected = current[targetCompetitionId] ?? [];
      return {
        ...current,
        [targetCompetitionId]: selected.includes(memberId)
          ? selected.filter((id) => id !== memberId)
          : [...selected, memberId],
      };
    });
  };

  const handleAddSelectedMembers = async (targetCompetitionId: string) => {
    const memberIds = selectedMembers[targetCompetitionId] ?? [];
    const selected = members.filter((member) => memberIds.includes(member.id));
    if (selected.length === 0) return;
    const saved = await runMutation(
      () => addSeriesMembersToCompetition(targetCompetitionId, selected),
      '当日の参加者を開催回へ追加しました',
    );
    if (!saved) return;
    setSelectedMembers((current) => ({ ...current, [targetCompetitionId]: [] }));
  };

  if (loading) return <div className={styles.container}>読み込み中...</div>;
  if (!series) return <div className={styles.container}>大会シリーズが見つかりません</div>;

  return (
    <main className={styles.container}>
      <Link to="/competition-series" className={styles.backLink}>
        ← 大会シリーズ一覧に戻る
      </Link>
      <h1 className={styles.title}>{series.name}</h1>
      {series.description && <p className={styles.description}>{series.description}</p>}
      <p className={styles.period}>
        {formatDate(series.startDate)} 〜 {formatDate(series.endDate)}
      </p>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>シリーズ総合成績</h2>
        </div>
        {aggregation.standings.length === 0 ? (
          <p className={styles.muted}>名寄せ済みの対局結果はまだありません。</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>順位</th>
                  <th>参加者</th>
                  <th>参加回数</th>
                  <th>対局数</th>
                  <th>合計ポイント</th>
                  <th>平均順位</th>
                  <th>チップ</th>
                </tr>
              </thead>
              <tbody>
                {aggregation.standings.map((standing) => (
                  <tr key={standing.seriesMemberId}>
                    <td>{standing.rank}</td>
                    <td>
                      {standing.name}
                      <div className={styles.breakdown}>
                        {standing.rounds.map((round) => (
                          <span key={round.competitionId}>
                            第{round.roundNumber}回 {formatPoint(round.totalPoint)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={styles.numeric}>{standing.appearanceCount}</td>
                    <td className={styles.numeric}>{standing.gameCount}</td>
                    <td className={`${styles.numeric} ${pointClass(standing.totalPoint)}`}>
                      {formatPoint(standing.totalPoint)}
                    </td>
                    <td className={styles.numeric}>{formatAverageRank(standing.averageRank)}</td>
                    <td className={`${styles.numeric} ${pointClass(standing.totalChip)}`}>
                      {formatPoint(standing.totalChip)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {aggregation.unlinkedParticipants.length > 0 && (
          <p className={styles.warning}>
            未紐付けの成績参加者が {aggregation.unlinkedParticipants.length}{' '}
            名います。開催回の名寄せを確認してください。
          </p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>シリーズ参加者 ({members.length}名)</h2>
        </div>
        {canManage && (
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>シリーズ参加者名</span>
              <Input
                aria-label="シリーズ参加者名"
                value={memberName}
                maxLength={32}
                onChange={(event) => setMemberName(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>ユーザーID（任意）</span>
              <Input
                aria-label="ユーザーID（任意）"
                value={memberUserId}
                onChange={(event) => setMemberUserId(event.target.value)}
              />
            </label>
            <div className={`${styles.actions} ${styles.fullWidth}`}>
              <Button onClick={handleAddMember} disabled={saving || !memberName.trim()}>
                メンバーを追加
              </Button>
            </div>
          </div>
        )}
        <div className={styles.memberList}>
          {members.map((member) => (
            <div
              key={member.id}
              className={`${styles.memberRow} ${member.active ? '' : styles.inactive}`}
            >
              <span>{member.name}</span>
              {canManage && (
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() =>
                    runMutation(
                      () =>
                        updateCompetitionSeriesMember(seriesId, member.id, {
                          active: !member.active,
                        }),
                      member.active ? 'メンバーを無効化しました' : 'メンバーを有効化しました',
                    )
                  }
                >
                  {member.active ? '無効化' : '有効化'}
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      {canManage && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>開催回を追加</h2>
            <Link
              className={styles.link}
              to={`/competitions/new?seriesId=${seriesId}&roundNumber=${nextRoundNumber}`}
            >
              第{nextRoundNumber}回を新規作成
            </Link>
          </div>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>既存大会ID</span>
              <Input
                aria-label="既存大会ID"
                value={competitionId}
                onChange={(event) => setCompetitionId(event.target.value)}
              />
            </label>
            <label className={styles.field}>
              <span>回番号</span>
              <Input
                aria-label="回番号"
                type="number"
                min={1}
                value={roundNumber}
                onChange={(event) => setRoundNumber(event.target.value)}
              />
            </label>
            <div className={`${styles.actions} ${styles.fullWidth}`}>
              <Button onClick={handleLinkCompetition} disabled={saving}>
                既存大会を紐付け
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>開催回</h2>
        <div className={styles.roundList}>
          {rounds.map(({ round, competition, participants }) => {
            const usedMemberIds = new Set(
              participants.flatMap((participant) =>
                participant.seriesMemberId ? [participant.seriesMemberId] : [],
              ),
            );
            const availableMembers = members.filter(
              (member) => member.active && !usedMemberIds.has(member.id),
            );
            const canManageRound = Boolean(
              canManage &&
              uid &&
              competition &&
              (competition.organizerId === uid || competition.coOrganizerIds.includes(uid)),
            );
            const canUnlinkRound = Boolean(canManage && uid && competition?.organizerId === uid);
            return (
              <article key={round.id} className={styles.roundCard}>
                <div className={styles.roundHeader}>
                  <div>
                    <span className={styles.roundNumber}>第{round.roundNumber}回</span>
                    {competition ? (
                      <Link className={styles.link} to={`/competitions/${competition.id}`}>
                        <h3 className={styles.roundTitle}>{competition.name}</h3>
                      </Link>
                    ) : (
                      <h3 className={styles.roundTitle}>大会を読み込めません</h3>
                    )}
                  </div>
                  {canUnlinkRound && competition && (
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() =>
                        runMutation(
                          () =>
                            unlinkCompetitionFromSeries(
                              seriesId,
                              competition.id,
                              round.roundNumber,
                            ),
                          '開催回の紐付けを解除しました',
                        )
                      }
                    >
                      紐付け解除
                    </Button>
                  )}
                </div>

                {competition && (
                  <>
                    <h4 className={styles.subsectionTitle}>参加者の名寄せ</h4>
                    <div className={styles.participantList}>
                      {participants.map((participant) => (
                        <div key={participant.id} className={styles.participantRow}>
                          <span>
                            {participant.name}
                            {!participant.seriesMemberId && '（未紐付け）'}
                          </span>
                          {canManageRound && (
                            <select
                              className={styles.select}
                              aria-label={`${participant.name}の紐付け先`}
                              value={participant.seriesMemberId ?? ''}
                              onChange={(event) =>
                                runMutation(
                                  () =>
                                    linkCompetitionParticipantToSeriesMember(
                                      competition.id,
                                      participant.id,
                                      event.target.value || null,
                                      participants.map((item) => item.id),
                                    ),
                                  '参加者の名寄せを更新しました',
                                )
                              }
                            >
                              <option value="">未紐付け</option>
                              {members.map((member) => (
                                <option
                                  key={member.id}
                                  value={member.id}
                                  disabled={
                                    usedMemberIds.has(member.id) &&
                                    member.id !== participant.seriesMemberId
                                  }
                                >
                                  {member.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      ))}
                    </div>

                    {canManageRound && availableMembers.length > 0 && (
                      <>
                        <h4 className={styles.subsectionTitle}>当日の参加者を追加</h4>
                        <div className={styles.checkboxList}>
                          {availableMembers.map((member) => (
                            <label key={member.id} className={styles.checkboxLabel}>
                              <input
                                type="checkbox"
                                aria-label={`${member.name}を第${round.roundNumber}回へ追加`}
                                checked={(selectedMembers[competition.id] ?? []).includes(
                                  member.id,
                                )}
                                onChange={() => toggleSelectedMember(competition.id, member.id)}
                              />
                              {member.name}
                            </label>
                          ))}
                        </div>
                        <div className={styles.actions}>
                          <Button
                            size="small"
                            onClick={() => handleAddSelectedMembers(competition.id)}
                            disabled={
                              (selectedMembers[competition.id] ?? []).length === 0 || saving
                            }
                          >
                            選択したメンバーを追加
                          </Button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
};
