import mongoose, { Schema, Document } from 'mongoose';

export interface IReport extends Document {
    type: string;
    period: string;
    generatedData: any; // Schema.Types.Mixed
    managerId?: number;
    createdAt: Date;
}

const ReportSchema: Schema = new Schema({
    type: { 
        type: String, 
        required: true 
    },
    period: { 
        type: String, 
        required: true 
    },
    generatedData: { 
        type: Schema.Types.Mixed, 
        required: true // Mongoose зберігає тут будь-яку JSON структуру "як є" [cite: 13-16]
    },
    managerId: { 
        type: Number, 
        required: false 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

export default mongoose.model<IReport>('Report', ReportSchema);