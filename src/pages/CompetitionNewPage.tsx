import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CompetitionForm } from '../components/features/CompetitionForm';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useUserSettings } from '../hooks/useUserSettings';
import { addParticipant, createCompetition } from '../services/competitionService';
import { auth } from '../services/firebase';
import type { CompetitionSettings } from '../types';
import { hashPasscode } from '../utils/hash';
import { generateId } from '../utils/id';
import { writeStoredPlayerName } from '../utils/userSettings';

export const CompetitionNewPage = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const { userSettings } = useUserSettings();
  const [loading, setLoading] = useState(false);
  const initialOrganizerDisplayName = userSettings.displayName || '主催者名';

  const handleSubmit = async (data: {
    name: string;
    description: string;
    hasPasscode: boolean;
    passcode: string;
    autoJoinOrganizer: boolean;
    organizerDisplayName: string;
    settings: CompetitionSettings;
  }) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      showSnackbar('認証エラーが発生しました。リロードしてください。', { position: 'top' });
      return;
    }

    const organizerDisplayName = data.organizerDisplayName.trim();
    if (data.autoJoinOrganizer && !organizerDisplayName) {
      showSnackbar('主催者表示名を入力してください', { position: 'top' });
      return;
    }

    setLoading(true);
    try {
      const id = generateId(12);
      const hashedPasscode =
        data.hasPasscode && data.passcode ? await hashPasscode(data.passcode, id) : undefined;

      await createCompetition(
        {
          id,
          name: data.name,
          description: data.description || undefined,
          organizerId: currentUser.uid,
          coOrganizerIds: [],
          status: 'recruiting',
          hasPasscode: data.hasPasscode,
          settings: data.settings,
        },
        hashedPasscode,
      );

      if (data.autoJoinOrganizer) {
        writeStoredPlayerName(organizerDisplayName);

        await addParticipant(id, {
          id: currentUser.uid,
          userId: currentUser.uid,
          name: organizerDisplayName,
          isGuest: currentUser.isAnonymous,
          status: 'idle',
          role: 'organizer',
        });
      }

      navigate(`/competitions/${id}`);
    } catch (error) {
      console.error('Failed to create competition:', error);
      showSnackbar('大会の作成に失敗しました');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 'var(--spacing-m)', maxWidth: '600px', margin: '0 auto' }}>
      <Link
        to="/competitions"
        style={{
          display: 'inline-block',
          marginBottom: 'var(--spacing-m)',
          color: 'var(--color-text-secondary)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-s)',
        }}
      >
        ← 大会一覧に戻る
      </Link>
      <h1 style={{ fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-l)' }}>
        大会を作成
      </h1>
      <CompetitionForm
        onSubmit={handleSubmit}
        organizerDisplayName={initialOrganizerDisplayName}
        initialSettings={userSettings.defaultCompetitionSettings}
        loading={loading}
      />
    </div>
  );
};
