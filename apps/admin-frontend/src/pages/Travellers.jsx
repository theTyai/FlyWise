import { useState } from 'react';
import { Users } from 'lucide-react';
import { date } from '@shared/ui/format.js';
import { Button, Dialog, EmptyState, Notice, Spinner, cx } from '@shared/ui/index.jsx';
import { PageHeader, Pagination, SearchField } from '../components/ui.jsx';
import { usePagedList } from '../hooks/usePagedList.js';
import { listTravellers, setAccountStatus } from '../services/traveller.service.js';

export default function Travellers() {
  const { q, data, loading, error, go, setData, setError } = usePagedList(
    ({ q: text, page }) => listTravellers({ q: text, page, limit: 20 }),
  );
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const suspending = target?.accountStatus === 'ACTIVE';

  async function apply() {
    setBusy(true);
    try {
      const accountStatus = suspending ? 'SUSPENDED' : 'ACTIVE';
      await setAccountStatus(target.id, accountStatus);
      setData((current) => ({ ...current, users: current.users.map((u) => (u.id === target.id ? { ...u, accountStatus } : u)) }));
      setMessage(suspending ? `${target.name} is suspended and has been signed out.` : `${target.name} can sign in again.`);
      setTarget(null);
    } catch (failure) {
      setMessage(null);
      setError(failure.message);
      setTarget(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Travellers" lead="Everyone with a FlyWise account. Suspending an account signs the traveller out and blocks new sign-ins. Their booking history is kept." />
      {message && <Notice tone="success" className="mb-5">{message}</Notice>}

      <div className="rounded-2xl bg-white shadow-pass">
        <div className="flex items-center justify-end gap-3 border-b border-line p-3 sm:p-4">
          {loading && data && <Spinner className="size-4 text-ink-faint" />}
          <SearchField value={q} onChange={(value) => go({ q: value, page: 1 })} placeholder="Name or email" label="Search travellers" />
        </div>
        {error && <div className="p-4"><Notice tone="error">{error}</Notice></div>}
        {!data && !error && <div className="flex justify-center py-16 text-ink-faint"><Spinner className="size-5" /></div>}
        {data && data.users.length === 0 && (
          <div className="p-5"><EmptyState icon={Users} title={q ? `Nobody matches "${q}"` : 'No travellers yet'}>{q ? 'Search by part of a name or email address.' : 'Accounts appear here when travellers register in the FlyWise app.'}</EmptyState></div>
        )}
        {data && data.users.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className={cx('w-full min-w-[44rem] text-left text-[15px] transition-opacity', loading && 'opacity-60')}>
                <thead>
                  <tr className="border-b border-line text-sm text-ink-faint">
                    <th scope="col" className="py-3 pr-3 pl-5 font-medium">Traveller</th>
                    <th scope="col" className="px-3 py-3 font-medium">Phone</th>
                    <th scope="col" className="px-3 py-3 text-right font-medium">Requests</th>
                    <th scope="col" className="px-3 py-3 font-medium">Joined</th>
                    <th scope="col" className="px-3 py-3 font-medium">Account</th>
                    <th scope="col" className="py-3 pr-5 pl-3"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className="border-b border-line last:border-0">
                      <td className="py-3 pr-3 pl-5">
                        <p className="font-semibold">{u.name}</p>
                        <p className="text-sm text-ink-faint">{u.email}</p>
                      </td>
                      <td className="px-3 py-3 text-ink-soft">{u.phone || <span className="text-ink-faint">Not given</span>}</td>
                      <td className="board px-3 py-3 text-right text-lg">{u.bookings}</td>
                      <td className="px-3 py-3 text-ink-soft">{date(u.createdAt)}</td>
                      <td className="px-3 py-3">
                        <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold',
                          u.accountStatus === 'ACTIVE' ? 'bg-mint-50 text-mint-700' : 'bg-stop-50 text-stop-700')}>
                          <span className={cx('size-1.5 rounded-full', u.accountStatus === 'ACTIVE' ? 'bg-mint-600' : 'bg-stop-600')} aria-hidden="true" />
                          {u.accountStatus === 'ACTIVE' ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3 pr-5 pl-3 text-right">
                        <Button size="sm" variant={u.accountStatus === 'ACTIVE' ? 'dangerOutline' : 'outline'} onClick={() => { setMessage(null); setTarget(u); }}>
                          {u.accountStatus === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-line"><Pagination meta={data.meta} onPage={(next) => go({ page: next })} /></div>
          </>
        )}
      </div>

      <Dialog open={Boolean(target)} onClose={() => setTarget(null)} title={suspending ? `Suspend ${target?.name}?` : `Reactivate ${target?.name}?`}
        footer={<><Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
          <Button variant={suspending ? 'danger' : 'primary'} loading={busy} onClick={apply}>{suspending ? 'Suspend account' : 'Reactivate account'}</Button></>}>
        {suspending
          ? 'They are signed out everywhere and cannot sign in or send requests. Existing requests stay as they are, and the change is written to the audit log.'
          : 'They can sign in and send booking requests again. The change is written to the audit log.'}
      </Dialog>
    </>
  );
}
