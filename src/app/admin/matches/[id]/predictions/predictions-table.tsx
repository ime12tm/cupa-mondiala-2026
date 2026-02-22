'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMatchDate } from '@/lib/date-utils';
import { EditPredictionForm } from './edit-prediction-form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Prediction } from '@/db/schema';

interface PredictionsTableProps {
  predictions: (Prediction & {
    user: {
      displayName: string | null;
      username: string | null;
      email: string;
    };
  })[];
}

export function PredictionsTable({ predictions }: PredictionsTableProps) {
  const [editingId, setEditingId] = useState<number | null>(null);

  const resultLabels: Record<string, string> = {
    '1': 'Home Win',
    'X': 'Draw',
    '2': 'Away Win',
  };

  const editingPrediction = predictions.find((p) => p.id === editingId);

  if (editingPrediction) {
    return (
      <div className="max-w-2xl mx-auto">
        <EditPredictionForm
          prediction={editingPrediction}
          onCancel={() => setEditingId(null)}
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead className="text-center">Home Score</TableHead>
            <TableHead className="text-center">Away Score</TableHead>
            <TableHead className="hidden md:table-cell">Result</TableHead>
            <TableHead className="text-right hidden md:table-cell">Points</TableHead>
            <TableHead className="hidden md:table-cell">Status</TableHead>
            <TableHead className="hidden md:table-cell">Submitted</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {predictions.map((prediction) => (
            <TableRow key={prediction.id}>
              <TableCell>
                <div>
                  <div className="text-sm font-medium">
                    {prediction.user.displayName ||
                      prediction.user.username ||
                      'Anonymous'}
                  </div>
                  <div className="text-xs text-foreground/60">
                    {prediction.user.email}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-lg md:text-xl font-bold">{prediction.homeScore}</span>
              </TableCell>
              <TableCell className="text-center">
                <span className="text-lg md:text-xl font-bold">{prediction.awayScore}</span>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge variant="default">{resultLabels[prediction.result]}</Badge>
              </TableCell>
              <TableCell className="text-right hidden md:table-cell">
                {prediction.pointsEarned !== null ? (
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {prediction.pointsEarned}
                  </span>
                ) : (
                  <span className="text-foreground/40">-</span>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {prediction.isLocked ? (
                  <Badge variant="default">Locked</Badge>
                ) : (
                  <Badge variant="info">Open</Badge>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="text-sm text-foreground/60">
                  {formatMatchDate(new Date(prediction.createdAt))}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingId(prediction.id)}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
