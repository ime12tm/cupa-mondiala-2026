'use client';

import { useRouter } from 'next/navigation';
import { Select } from '@/components/ui/select';
import type { User } from '@/db/schema';

interface UserPredictionsNavProps {
  users: User[];
}

export function UserPredictionsNav({ users }: UserPredictionsNavProps) {
  const router = useRouter();

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    if (userId) {
      router.push(`/admin/users/${userId}/predictions`);
    }
  };

  const getUserDisplayName = (user: User) => {
    return user.displayName || user.username || user.email.split('@')[0];
  };

  return (
    <div className="space-y-2">
      <label htmlFor="user-select" className="block text-sm font-medium">
        View User Predictions
      </label>
      <Select
        id="user-select"
        onChange={handleUserChange}
        defaultValue=""
        className="w-full"
      >
        <option value="">Select a user...</option>
        {users.map((user) => (
          <option key={user.userId} value={user.userId}>
            {getUserDisplayName(user)} ({user.totalPoints} pts)
          </option>
        ))}
      </Select>
    </div>
  );
}
