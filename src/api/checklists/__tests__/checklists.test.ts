jest.mock('@/api/common/client', () => ({ api: { get: jest.fn(), post: jest.fn() } }));
import { api } from '@/api/common/client';
import { getDueChecklists, previewChecklistOccurrence, startChecklistRun, saveChecklistRun, uploadChecklistImage } from '@/api/checklists/checklists';
import { run } from '@/lib/checklists/__tests__/fixtures';
beforeEach(()=>{jest.clearAllMocks();jest.mocked(api.get).mockResolvedValue({data:{Data:run()}});jest.mocked(api.post).mockResolvedValue({data:{Data:run()}});});
it('scopes Unit checks by active unit and Responder checks to the current user',async()=>{
 await getDueChecklists(2,'12'); expect(api.get).toHaveBeenCalledWith('/ChecklistRuns/GetDueChecklists',{params:{page:2,unitId:'12',forCurrentUser:false}});
 await getDueChecklists(0); expect(api.get).toHaveBeenLastCalledWith('/ChecklistRuns/GetDueChecklists',{params:{page:0,unitId:undefined,forCurrentUser:true}});
});
it('uses read-only previews and pins the client GUID and published version when starting',async()=>{
 await previewChecklistOccurrence('occurrence');expect(api.get).toHaveBeenCalledWith('/ChecklistRuns/GetChecklistRun',{params:{occurrenceId:'occurrence'}});
 const input={CompletionId:run().Id,DefinitionId:'definition',VersionId:'version-1',TargetId:'77'};await startChecklistRun(input);expect(api.post).toHaveBeenCalledWith('/ChecklistRuns/StartChecklistRun',input);
});
it('sends revisioned evidence in memory and keeps the supplied revision on final submission',async()=>{
 await uploadChecklistImage(run().Id,3,{id:'image',itemId:'first',name:'photo.png',contentType:'image/png',base64:'synthetic'});
 expect(api.post).toHaveBeenCalledWith('/ChecklistRuns/UploadChecklistRunFile',{Id:run().Id,Revision:3,ItemId:'first',Name:'photo.png',ContentType:'image/png',Data:'synthetic'});
 await saveChecklistRun(run().Id,{Revision:4,Answers:[]},true);expect(api.post).toHaveBeenCalledWith('/ChecklistRuns/CompleteChecklistRun',{Id:run().Id,Input:{Revision:4,Answers:[]}});
});
