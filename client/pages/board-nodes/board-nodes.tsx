import { type ReactElement, useEffect, useState } from 'react';

import { BoardNodeModal } from './components/board-node-modal';
import { CreateGreenNodesModal } from './components/create-green-nodes-modal';
import { CreateYellowNodesModal } from './components/create-yellow-nodes-modal';
import { booleanNumberTrue } from '../../../shared/constants/boolean-constants';
import { boardNodeCategories, boardNodeCategoryYellow } from '../../../shared/constants/holodori-constants';
import { formatDecimal } from '../../../shared/helpers/format-decimal';
import { isEmpty } from '../../../shared/helpers/is-empty';
import { BoardNodesService } from '../../../shared/services/board-nodes-service';
import { HolomemNoteModal } from '../../components/holomem-note-modal/holomem-note-modal';
import { failedToFetchMessage } from '../../constants/client-messages';
import { categoryNames, yellowTargetNames } from '../../constants/holodori-constants';
import { adminApi } from '../../helpers/admin-api';
import { extractApiErrorMessage } from '../../helpers/extract-api-error-message';
import { useHolomemsStore } from '../../stores/holomems-store';

import type { BoardNode } from '../../../shared/types/entities/board-node';
import type { Holomem } from '../../../shared/types/entities/holomem';
import type { BoardNodeCategory } from '../../../shared/types/holodori/board-node-types';

/** カテゴリ見出しの文字色を表現する CSS クラス名・Tailwind ビルド時に全クラスを検出できるようカテゴリ別のクラス名は動的に組み立てず列挙する */
const categoryColourClassText: Record<BoardNodeCategory, string> = {
  yellow: 'text-warning',
  green : 'text-success',
  red   : 'text-error',
  blue  : 'text-info'
};

/** ホロメン見出しの枠線色を表現する CSS クラス名 */
const categoryColourClassBorder: Record<BoardNodeCategory, string> = {
  yellow: 'border-warning',
  green : 'border-success',
  red   : 'border-error',
  blue  : 'border-info'
};

/** ボードノード一覧ページ */
export default function BoardNodesPage(): ReactElement {
  const [isLoading , setIsLoading ] = useState<boolean>(true);                    // 一覧の初期読込中か否か
  const [boardNodes, setBoardNodes] = useState<Array<BoardNode>>([]);             // API から取得したボードマス一覧
  const [listError , setListError ] = useState<string>('');                       // 一覧読込時のエラーメッセージ
  const holomems                    = useHolomemsStore(state => state.holomems);  // 複数ページで使用されるためインメモリ Store でキャッシュする
  
  const [isBoardNodeModalOpen        , setIsBoardNodeModalOpen        ] = useState<boolean>(false);          // 単体の新規追加・編集モーダルを表示中か否か
  const [editingBoardNode            , setEditingBoardNode            ] = useState<BoardNode | null>(null);  // 単体モーダルの編集対象・`null` の場合は新規追加
  const [isCreateYellowNodesModalOpen, setIsCreateYellowNodesModalOpen] = useState<boolean>(false);          // 黄マス一括追加モーダルを表示中か否か
  const [isCreateGreenNodesModalOpen , setIsCreateGreenNodesModalOpen ] = useState<boolean>(false);          // 緑マス一括追加モーダルを表示中か否か
  
  // ホロメンメモの編集対象・`null` はモーダルを閉じている状態
  const [noteTargetHolomem, setNoteTargetHolomem] = useState<Holomem | null>(null);
  
  /** ボードマス一覧を API から取得し、取得エラーを画面表示用 State に反映する */
  const onLoadBoardNodes = async (): Promise<void> => {
    setListError('');
    try {
      const boardNodesResponse = await adminApi.get('/api/board-nodes').json<{ result: Array<BoardNode>; }>();
      setBoardNodes(boardNodesResponse.result);
    }
    catch(error) {
      setListError(extractApiErrorMessage(error, failedToFetchMessage('ボードノード一覧')));
    }
  };
  
  /** 未取得の場合にホロメン一覧を Store に読み込み、取得エラーを画面表示用 State に反映する */
  const onLoadHolomems = async (): Promise<void> => {
    const result = await useHolomemsStore.getState().loadHolomems();
    if(result.error != null) setListError(result.error);
  };
  
  // 画面初期表示時にボードマス一覧とホロメン一覧を並行して読み込む
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        await Promise.all([onLoadBoardNodes(), onLoadHolomems()]);
      }
      finally {
        setIsLoading(false);
      }
    })();
  }, []);
  
  /** 単体のボードマス新規追加モーダルを開く */
  const onStartCreate = (): void => {
    setEditingBoardNode(null);
    setIsBoardNodeModalOpen(true);
  };
  
  /** 単体のボードマス編集モーダルを開く */
  const onStartEdit = (boardNode: BoardNode): void => {
    setEditingBoardNode(boardNode);
    setIsBoardNodeModalOpen(true);
  };
  
  /** 編集対象をリセットして単体のボードマスモーダルを閉じる */
  const onCloseBoardNodeModal = (): void => {
    setEditingBoardNode(null);
    setIsBoardNodeModalOpen(false);
  };
  
  /** 黄マス一括追加モーダルを開く */
  const onOpenCreateYellowNodesModal = (): void => setIsCreateYellowNodesModalOpen(true);
  
  /** 黄マス一括追加モーダルを閉じる */
  const onCloseCreateYellowNodesModal = (): void => setIsCreateYellowNodesModalOpen(false);
  
  /** 緑マス一括追加モーダルを開く */
  const onOpenCreateGreenNodesModal = (): void => setIsCreateGreenNodesModalOpen(true);
  
  /** 緑マス一括追加モーダルを閉じる */
  const onCloseCreateGreenNodesModal = (): void => setIsCreateGreenNodesModalOpen(false);
  
  /** ホロメンメモの編集を開始する */
  const onOpenNoteModal = (holomem: Holomem): void => setNoteTargetHolomem(holomem);
  
  /** 編集対象をリセットしてホロメンメモ編集モーダルを閉じる */
  const onCloseNoteModal = (): void => setNoteTargetHolomem(null);
  
  /** 更新後に共有するホロメン一覧を再読込する */
  const onUpdateHolomemNote = async (): Promise<void> => {
    const reloadResult = await useHolomemsStore.getState().reloadHolomems();
    if(reloadResult.error != null) setListError(reloadResult.error);
  };
  
  return (
    <main>
      <h1>ホロメンボード一覧</h1>
      
      {!isEmpty(listError) && (
        <div className="alert alert-error alert-soft mb-4">{listError}</div>
      )}
      
      {isLoading ? (
        <div className="text-center">
          <span className="loading loading-spinner text-warning" />
        </div>
      ) : (
        <>
          {boardNodes.length === 0 ? (
            <p className="mb-4">登録されているマスはありません。</p>
          ) : (
            boardNodeCategories.map(category => {
              // 1カテゴリごとに表示する
              const categoryNodes = boardNodes.filter(boardNode => boardNode.category === category);
              if(categoryNodes.length === 0) return null;
              
              return (
                <section key={category} className="mb-8">
                  <h2 className={`mb-4 text-lg font-bold ${categoryColourClassText[category]}`}>{categoryNames[category]}</h2>
                  
                  {/* 1カテゴリ内のホロメンごとに分割して表示する */}
                  {holomems.map(holomem => {
                    const nodes = categoryNodes.filter(boardNode => boardNode.holomems_id === holomem.id);
                    if(nodes.length === 0) return null;
                    
                    return (
                      <section key={holomem.id} className="mb-6">
                        <h3 className={`border-l-8 pl-2 font-bold ${categoryColourClassBorder[category]}`}>
                          {holomem.group_name} : {holomem.name} <span className="text-xs font-normal">(ID : {holomem.id})</span>
                        </h3>
                        
                        <div className="overflow-x-auto">
                          {/* 全体の最小幅を `min-w` で決め、「ホロメンメモ」列を `15rem` に固定して残りを「マス効果」列に割り当てるよう `minmax` 指定をしている */}
                          <div className="grid min-w-175 grid-cols-[minmax(0,1fr)_15rem]">
                            <div>
                              <table className="table table-xs">
                                <colgroup>
                                  {category === boardNodeCategoryYellow && (<col className="w-px" />)}
                                  <col />
                                  <col className="w-px" />
                                  <col className="w-px" />
                                  <col className="w-px" />
                                  <col className="w-px" />
                                </colgroup>
                                <thead>
                                  <tr className="[&>th]:whitespace-nowrap">  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                                    {category === boardNodeCategoryYellow && (<th className="pl-0 pr-1">報酬 UP</th>)}
                                    <th className={category === boardNodeCategoryYellow ? 'px-1' : 'pl-0 pr-1'}>マス効果</th>
                                    <th className="px-1      text-right ">効果</th>
                                    <th className="px-1      text-right ">コネクト</th>
                                    <th className="px-1      text-right ">合計</th>
                                    <th className="pl-1 pr-0 text-center">編集</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {nodes.map(node => (
                                    <tr key={node.id} className={`[&>td]:align-top ${node.is_unlocked === booleanNumberTrue ? '' : 'bg-base-300'}`}>  {/* eslint-disable-line neos-eslint-plugin/comment-colon-spacing */}
                                      {category === boardNodeCategoryYellow && (<td className="pl-0 pr-1 whitespace-nowrap">{isEmpty(node.yellow_target) ? '-' : yellowTargetNames[node.yellow_target!]}</td>)}
                                      <td className={`${category === boardNodeCategoryYellow ? 'px-1' : 'pl-0 pr-1'} whitespace-pre-wrap`}>{node.description}</td>
                                      <td className="px-1           whitespace-nowrap text-right               ">{formatDecimal(node.amount)}</td>
                                      <td className="px-1           whitespace-nowrap text-right               ">{node.connect_rate == null ? '-' : `${node.connect_rate}%`}</td>
                                      <td className="px-1           whitespace-nowrap text-right  font-bold    ">{formatDecimal(BoardNodesService.calcFinalRate(node.amount, node.connect_rate))}%</td>
                                      <td className="pl-1 pr-0 py-0 whitespace-nowrap text-center !align-middle"><button type="button" className="btn btn-xs w-full" onClick={() => onStartEdit(node)}>編集</button></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            
                            <table className="table table-xs">
                              <thead>
                                <tr>
                                  <th className="pl-1 pr-0 whitespace-nowrap text-left">ホロメンメモ</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="pl-1 pr-0 text-xs whitespace-pre-wrap align-top cursor-pointer" onClick={() => onOpenNoteModal(holomem)}>{isEmpty(holomem.note) ? '-' : holomem.note}</td>  { }
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </section>
              );
            })
          )}
          
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn btn-warning" onClick={onOpenCreateYellowNodesModal}>黄マス一括追加</button>
            <button type="button" className="btn btn-success" onClick={onOpenCreateGreenNodesModal}>緑マス一括追加</button>
            <button type="button" className="btn btn-info"    onClick={onStartCreate}>新規マス追加</button>
          </div>
        </>
      )}
      
      {/* 黄マス一括追加モーダル */}
      {isCreateYellowNodesModalOpen && (
        <CreateYellowNodesModal
          holomems={holomems}
          onClose={onCloseCreateYellowNodesModal}
          onUpdated={onLoadBoardNodes}
        />
      )}
      
      {/* 緑マス一括追加モーダル */}
      {isCreateGreenNodesModalOpen && (
        <CreateGreenNodesModal
          holomems={holomems}
          onClose={onCloseCreateGreenNodesModal}
          onUpdated={onLoadBoardNodes}
        />
      )}
      
      {/* 新規マス追加 or マス編集モーダル */}
      {isBoardNodeModalOpen && (
        <BoardNodeModal
          boardNode={editingBoardNode}
          holomems={holomems}
          onClose={onCloseBoardNodeModal}
          onUpdated={onLoadBoardNodes}
        />
      )}
      
      {/* ホロメンメモ編集モーダル */}
      {noteTargetHolomem != null && (
        <HolomemNoteModal
          holomem={noteTargetHolomem}
          onClose={onCloseNoteModal}
          onUpdated={onUpdateHolomemNote}
        />
      )}
    </main>
  );
}
